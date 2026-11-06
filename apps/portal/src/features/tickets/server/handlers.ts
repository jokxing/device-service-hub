import "server-only";
import { NextResponse } from "next/server";
import { currentUser } from "../../auth/server/session";
import { backendFetch } from "../../../shared/server/api";
import { privateHeaders } from "../../../shared/server/config";
import { errorResponse, readJsonBody } from "../../../shared/server/request";

async function forwardTicketCommand(
  request: Request,
  route: string,
  fallback: string,
) {
  const input = await readJsonBody(request);
  if (input.response) return input.response;
  try {
    const user = await currentUser();
    if (!user) return errorResponse("登录已过期，请重新登录", 401);
    if (user.role !== "reporter")
      return errorResponse("此入口仅对报修用户开放", 403);
    const upstream = await backendFetch(route, {
      method: "POST",
      body: input.body,
      headers: { "Content-Type": "application/json" },
    });
    if (upstream.status >= 500) return errorResponse(fallback, 502);
    const data: unknown = await upstream.json();
    if (!upstream.ok) {
      const message =
        data && typeof data === "object" && "message" in data
          ? data.message
          : null;
      const text =
        typeof message === "string"
          ? message
          : Array.isArray(message) &&
              message.every((value) => typeof value === "string")
            ? message.join("；")
            : "操作失败，请核对信息后重试";
      return errorResponse(text, upstream.status);
    }
    // Preserve upstream status and the caller's requestId/version; never retry here.
    return NextResponse.json(data, {
      status: upstream.status,
      headers: privateHeaders,
    });
  } catch {
    return errorResponse(fallback, 502);
  }
}

export function createTicket(request: Request) {
  return forwardTicketCommand(
    request,
    "/tickets",
    "尚未确认提交结果，请重试相同内容或查看我的报修",
  );
}
export function confirmTicket(request: Request, id: string) {
  return forwardTicketCommand(
    request,
    `/tickets/${encodeURIComponent(id)}/confirm`,
    "尚未确认操作结果，可重试，或关闭后刷新报修记录核对。",
  );
}

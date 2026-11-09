import "server-only";
import { NextResponse } from "next/server";
import { currentUser } from "./session";
import { backendFetch } from "../../../shared/server/api";
import { privateHeaders } from "../../../shared/server/config";
import { errorResponse, readJsonBody } from "../../../shared/server/request";

export async function reporterPost(
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

import "server-only";
import { NextResponse } from "next/server";
import type { LoginResponse } from "@device-service-hub/contracts";
import { backendFetch } from "../../../shared/server/api";
import {
  API_COOKIE,
  PORTAL_COOKIE,
  PORTAL_ORIGIN,
  cookieOptions,
  privateHeaders,
} from "../../../shared/server/config";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: privateHeaders });
}
function checkOrigin(request: Request) {
  return request.headers.get("origin") === PORTAL_ORIGIN;
}

export async function login(request: Request) {
  if (!checkOrigin(request)) return errorResponse("请求来源无效", 403);
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return errorResponse("请使用 JSON 提交", 415);
  if (Number(request.headers.get("content-length")) > 16384)
    return errorResponse("请求内容过大", 413);
  const body = await request.text();
  if (new TextEncoder().encode(body).length > 16384)
    return errorResponse("请求内容过大", 413);
  try {
    JSON.parse(body);
  } catch {
    return errorResponse("请求内容无效", 400);
  }
  try {
    const upstream = await backendFetch("/auth/login", {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });
    if (!upstream.ok)
      return errorResponse(
        upstream.status === 401
          ? "账号或密码错误"
          : "登录失败，请核对输入后重试",
        upstream.status,
      );
    const data = (await upstream.json()) as LoginResponse;
    const cookie = upstream.headers
      .getSetCookie()
      .find((value) => value.startsWith(API_COOKIE + "="));
    const token = cookie?.split(";")[0]?.slice(API_COOKIE.length + 1);
    if (!token || !/^[a-f0-9]{64}$/.test(token))
      throw new Error("Invalid session response");
    if (data.user.role !== "reporter") {
      await backendFetch("/auth/logout", {
        method: "POST",
        headers: { Cookie: `${API_COOKIE}=${token}` },
      });
      return errorResponse("用户门户仅对报修用户开放，请使用管理后台入口", 403);
    }
    const response = NextResponse.json(
      { user: data.user },
      { headers: privateHeaders },
    );
    response.cookies.set(PORTAL_COOKIE, token, {
      ...cookieOptions(),
      expires: new Date(data.expiresAt),
    });
    return response;
  } catch {
    return errorResponse("登录服务暂时不可用，请稍后重试", 502);
  }
}

export async function logout(request: Request) {
  if (!checkOrigin(request)) return errorResponse("请求来源无效", 403);
  try {
    const upstream = await backendFetch("/auth/logout", { method: "POST" });
    if (!upstream.ok) return errorResponse("退出未完成，请重试", 502);
    const response = new NextResponse(null, {
      status: 204,
      headers: privateHeaders,
    });
    response.cookies.set(PORTAL_COOKIE, "", { ...cookieOptions(), maxAge: 0 });
    return response;
  } catch {
    return errorResponse("退出未完成，请重试", 502);
  }
}

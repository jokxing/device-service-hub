import "server-only";
import { NextResponse } from "next/server";
import { PORTAL_ORIGIN, privateHeaders } from "./config";

export function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, { status, headers: privateHeaders });
}
export function hasValidOrigin(request: Request) {
  return request.headers.get("origin") === PORTAL_ORIGIN;
}
export async function readJsonBody(
  request: Request,
): Promise<
  { body: string; response?: never } | { response: NextResponse; body?: never }
> {
  if (!hasValidOrigin(request))
    return { response: errorResponse("请求来源无效", 403) };
  if (!request.headers.get("content-type")?.startsWith("application/json"))
    return { response: errorResponse("请使用 JSON 提交", 415) };
  if (Number(request.headers.get("content-length")) > 16384)
    return { response: errorResponse("请求内容过大", 413) };
  try {
    const body = await request.text();
    if (new TextEncoder().encode(body).length > 16384)
      return { response: errorResponse("请求内容过大", 413) };
    JSON.parse(body);
    return { body };
  } catch {
    return { response: errorResponse("请求内容无效", 400) };
  }
}

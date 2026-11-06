import "server-only";
import { cookies } from "next/headers";
import {
  API_BASE_URL,
  API_COOKIE,
  PORTAL_COOKIE,
  PORTAL_ORIGIN,
} from "./config";

export class BackendError extends Error {
  constructor(public readonly status: number) {
    super("设备服务暂时不可用");
  }
}

/** Only explicit server-owned API paths and the portal's session are forwarded. */
export async function backendFetch(route: string, init: RequestInit = {}) {
  const token = (await cookies()).get(PORTAL_COOKIE)?.value;
  return fetch(API_BASE_URL + route, {
    ...init,
    cache: "no-store",
    redirect: "error",
    signal: AbortSignal.timeout(10000),
    headers: {
      ...(token
        ? { Cookie: `${API_COOKIE}=${encodeURIComponent(token)}` }
        : {}),
      ...(init.method === "POST" ? { Origin: PORTAL_ORIGIN } : {}),
      ...init.headers,
    },
  });
}

export async function backendGet<T>(route: string): Promise<T> {
  const response = await backendFetch(route);
  if (!response.ok) throw new BackendError(response.status);
  return response.json() as Promise<T>;
}

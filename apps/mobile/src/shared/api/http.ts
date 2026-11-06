import { API_BASE_URL } from "./config";
export type AuthenticatedRead = <T>(
  route: string,
  signal?: AbortSignal,
) => Promise<T>;
export type AuthenticatedPost = <T>(
  route: string,
  body: unknown,
  signal?: AbortSignal,
) => Promise<T>;
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function apiRequest<T>(
  route: string,
  {
    token,
    body,
    method = "GET",
    signal,
  }: {
    token?: string;
    body?: unknown;
    method?: "GET" | "POST";
    signal?: AbortSignal;
  } = {},
): Promise<T> {
  const controller = new AbortController();
  let timedOut = false;
  const abort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener("abort", abort);
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, 12000);
  try {
    const response = await fetch(API_BASE_URL + route, {
      method,
      credentials: "omit",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) {
      const value: unknown = await response.json().catch(() => null);
      const message =
        value &&
        typeof value === "object" &&
        "message" in value &&
        typeof value.message === "string"
          ? value.message
          : "请求失败，请重试";
      throw new ApiError(response.status, message);
    }
    return response.status === 204
      ? (undefined as T)
      : ((await response.json()) as T);
  } catch (error) {
    if (error instanceof ApiError || signal?.aborted) throw error;
    throw new Error(
      timedOut ? "请求超时，请重试" : "无法连接设备服务，请检查连接后重试",
    );
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abort);
  }
}

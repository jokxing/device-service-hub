export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}

async function requestResponse(
  path: string,
  options: RequestInit = {},
): Promise<Response> {
  const response = await fetch(`/api${path}`, {
    ...options,
    credentials: "same-origin",
    headers: {
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (!response.ok) {
    const body: unknown = await response.json().catch(() => null);
    const detail =
      body && typeof body === "object" && "message" in body
        ? body.message
        : undefined;
    throw new ApiError(
      response.status,
      typeof detail === "string"
        ? detail
        : response.status === 401
          ? "登录已过期，请重新登录"
          : "请求失败，请稍后重试",
    );
  }
  return response;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await requestResponse(path, options);
  return response.status === 204
    ? (undefined as T)
    : (response.json() as Promise<T>);
}

export async function apiImageRequest(
  path: string,
  signal?: AbortSignal,
): Promise<Blob> {
  const response = await requestResponse(path, {
    signal,
    cache: "no-store",
    headers: { Accept: "image/webp" },
  });
  if (response.headers.get("Content-Type") !== "image/webp")
    throw new Error("图片格式异常，请刷新重试");
  return response.blob();
}

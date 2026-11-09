export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

// Business mutation hooks retain their shorter 15s intent timeout.
const REQUEST_TIMEOUT_MS = 20000;

async function readResponse<T>(
  path: string,
  options: RequestInit,
  read: (response: Response) => Promise<T>,
): Promise<T> {
  const controller = new AbortController();
  const abort = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abort();
  options.signal?.addEventListener("abort", abort, { once: true });
  const timer = setTimeout(
    () => controller.abort("timeout"),
    REQUEST_TIMEOUT_MS,
  );
  try {
    controller.signal.throwIfAborted();
    const response = await fetch(`/api${path}`, {
      ...options,
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
      headers: {
        Accept: "application/json",
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      controller.signal.throwIfAborted();
      const detail =
        body && typeof body === "object" && "message" in body
          ? body.message
          : undefined;
      throw new ApiError(
        response.status,
        typeof detail === "string"
          ? detail
          : Array.isArray(detail) &&
              detail.every((value) => typeof value === "string")
            ? detail.join("；")
            : response.status === 401
              ? "登录已过期，请重新登录"
              : "请求失败，请稍后重试",
      );
    }
    const result = await read(response);
    controller.signal.throwIfAborted();
    return result;
  } catch (error) {
    // Caller cancellation belongs to its lifecycle, not a network failure.
    if (options.signal?.aborted) throw error;
    if (controller.signal.aborted) {
      throw new ApiError(
        408,
        options.method && options.method !== "GET"
          ? "请求超时，请先核对操作结果后重试"
          : "请求超时，请稍后重试",
      );
    }
    if (error instanceof TypeError) {
      throw new Error("无法连接设备服务，请检查连接后重试");
    }
    throw error;
  } finally {
    clearTimeout(timer);
    options.signal?.removeEventListener("abort", abort);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  return readResponse(path, options, async (response) =>
    response.status === 204
      ? (undefined as T)
      : (response.json() as Promise<T>),
  );
}

export async function apiImageRequest(
  path: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return readResponse(
    path,
    {
      signal,
      cache: "no-store",
      headers: { Accept: "image/webp" },
    },
    async (response) => {
      if (response.headers.get("Content-Type") !== "image/webp")
        throw new Error("图片格式异常，请刷新重试");
      return response.blob();
    },
  );
}

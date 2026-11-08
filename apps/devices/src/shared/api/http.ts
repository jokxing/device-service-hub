export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function apiGet<T>(path: string, signal: AbortSignal): Promise<T> {
  try {
    const response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      cache: "no-store",
      headers: { Accept: "application/json" },
      signal: AbortSignal.any([signal, AbortSignal.timeout(12000)]),
    });
    if (!response.ok) {
      const body: unknown = await response.json().catch(() => null);
      const message =
        body &&
        typeof body === "object" &&
        "message" in body &&
        typeof body.message === "string"
          ? body.message
          : "读取失败，请重试";
      throw new ApiError(response.status, message);
    }
    return response.json() as Promise<T>;
  } catch (error) {
    if (error instanceof ApiError || signal.aborted) throw error;
    throw new Error("无法连接设备服务，请检查连接后重试");
  }
}

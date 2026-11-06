import { useEffect, useState } from "react";
import { ApiError } from "../api/http";

/** Web-only read resource: cancel stale requests and clear old data on reload. */
export function useApiResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  onUnauthorized: () => void,
) {
  const [data, setData] = useState<T>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [version, setVersion] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setData(undefined);
    setError("");
    setLoading(true);
    load(controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setData(result);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) onUnauthorized();
        else
          setError(error instanceof Error ? error.message : "加载失败，请重试");
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [load, onUnauthorized, version]);
  return {
    data,
    loading,
    error,
    refresh: () => setVersion((value) => value + 1),
  };
}

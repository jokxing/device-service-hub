import { useCallback, useEffect, useState } from "react";

export function useApiResource<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    load(controller.signal)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((error) => {
        if (active)
          setError(error instanceof Error ? error.message : "读取失败，请重试");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [load, revision]);
  return {
    data,
    error,
    loading,
    reload,
  };
}

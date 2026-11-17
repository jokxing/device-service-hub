import { useCallback, useEffect, useRef, useState } from "react";

export function useApiResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  { keepPreviousData = false }: { keepPreviousData?: boolean } = {},
) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [revision, setRevision] = useState(0);
  const loadRef = useRef(load);
  const reload = useCallback(() => setRevision((value) => value + 1), []);
  useEffect(() => {
    const loadChanged = loadRef.current !== load;
    loadRef.current = load;
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setError("");
    // Only explicitly opted-in lists retain data during a same-query refresh.
    if (!keepPreviousData || loadChanged) setData(null);
    load(controller.signal)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((error) => {
        if (active) setData(null);
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
  }, [load, revision, keepPreviousData]);
  return {
    data,
    error,
    loading,
    reload,
  };
}

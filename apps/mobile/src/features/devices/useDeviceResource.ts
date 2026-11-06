import { useEffect, useState } from "react";
import { useNativeSession } from "../auth/sessionContext";
export function useDeviceResource<T>(route: string) {
  const { request } = useNativeSession();
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState("");
  const [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setLoading(true);
    setData(null);
    setError("");
    request<T>(route, controller.signal)
      .then((value) => {
        if (active) setData(value);
      })
      .catch((error) => {
        if (active)
          setError(error instanceof Error ? error.message : "读取设备失败");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
      controller.abort();
    };
  }, [route, revision, request]);
  return {
    data,
    error,
    loading,
    reload: () => setRevision((value) => value + 1),
  };
}

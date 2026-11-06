import { useEffect, useRef, useState } from "react";
export function useAction() {
  const busy = useRef(false),
    mounted = useRef(true);
  const [pending, setPending] = useState(false),
    [error, setError] = useState("");
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  async function run(action: () => Promise<void>) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setError("");
    try {
      await action();
    } catch (error) {
      if (mounted.current)
        setError(error instanceof Error ? error.message : "操作失败，请重试");
    } finally {
      busy.current = false;
      if (mounted.current) setPending(false);
    }
  }
  return { pending, error, run };
}

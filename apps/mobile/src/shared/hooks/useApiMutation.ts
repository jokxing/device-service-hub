import { useEffect, useRef } from "react";
import { useAction } from "./useAction";
/** One in-flight mutation; no automatic retries. Cancellation is not a rollback. */
export function useApiMutation() {
  const action = useAction();
  const active = useRef(true);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      controller.current?.abort();
    };
  }, []);
  function run<T>(
    operation: (signal: AbortSignal) => Promise<T>,
    onSuccess: (value: T) => void,
  ) {
    void action.run(async () => {
      controller.current = new AbortController();
      const value = await operation(controller.current.signal);
      if (active.current) onSuccess(value);
    });
  }
  return { pending: action.pending, error: action.error, run };
}

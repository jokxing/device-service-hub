import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/http";

const DEFAULT_TIMEOUT_MS = 15000;
interface Options {
  onUnauthorized: () => void;
  fallbackError: string;
  timeoutMs?: number;
}

/** Transport lifecycle only. Payloads, request IDs and retries belong to the caller. */
export function useApiMutation({
  onUnauthorized,
  fallbackError,
  timeoutMs = DEFAULT_TIMEOUT_MS,
}: Options) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const mounted = useRef(false);
  const active = useRef<{ controller: AbortController; timer: number } | null>(
    null,
  );
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (active.current) {
        window.clearTimeout(active.current.timer);
        active.current.controller.abort();
        active.current = null;
      }
    };
  }, []);

  async function run<T>(
    request: (signal: AbortSignal) => Promise<T>,
    onSuccess: (result: T) => void,
  ) {
    if (!mounted.current || active.current) return;
    const controller = new AbortController();
    const timer = window.setTimeout(
      () => controller.abort("timeout"),
      timeoutMs,
    );
    active.current = { controller, timer };
    setSubmitting(true);
    setError("");
    try {
      const result = await request(controller.signal);
      if (mounted.current && !controller.signal.aborted) onSuccess(result);
    } catch (error) {
      if (
        !mounted.current ||
        (controller.signal.aborted && controller.signal.reason !== "timeout")
      )
        return;
      if (error instanceof ApiError && error.status === 401) onUnauthorized();
      else setError(error instanceof ApiError ? error.message : fallbackError);
    } finally {
      window.clearTimeout(timer);
      if (active.current?.controller === controller) {
        active.current = null;
        if (mounted.current) setSubmitting(false);
      }
    }
  }
  return { submitting, error, run };
}

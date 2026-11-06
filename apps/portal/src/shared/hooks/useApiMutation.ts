"use client";

import { useEffect, useRef, useState } from "react";
import { ApiError } from "../api/http";

export function useApiMutation(
  fallbackError: string,
  onUnauthorized?: () => void,
) {
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
        clearTimeout(active.current.timer);
        active.current.controller.abort();
        active.current = null;
      }
    };
  }, []);
  async function run<T>(
    request: (signal: AbortSignal) => Promise<T>,
    onSuccess: (value: T) => void,
  ) {
    if (!mounted.current || active.current) return;
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort("timeout"), 15000);
    active.current = { controller, timer };
    setSubmitting(true);
    setError("");
    try {
      const value = await request(controller.signal);
      if (mounted.current && !controller.signal.aborted) onSuccess(value);
    } catch (error) {
      if (
        !mounted.current ||
        (controller.signal.aborted && controller.signal.reason !== "timeout")
      )
        return;
      if (error instanceof ApiError && error.status === 401 && onUnauthorized)
        onUnauthorized();
      else setError(error instanceof ApiError ? error.message : fallbackError);
    } finally {
      clearTimeout(timer);
      if (active.current?.controller === controller) {
        active.current = null;
        if (mounted.current) setSubmitting(false);
      }
    }
  }
  return { submitting, error, run };
}

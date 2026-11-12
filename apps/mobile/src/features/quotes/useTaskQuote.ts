import { useCallback } from "react";
import { useNativeSession } from "../auth/sessionContext";
import { useApiResource } from "../../shared/hooks/useApiResource";
import { readTaskQuote } from "./api";
export function useTaskQuote(id: string) {
  const { request, user } = useNativeSession();
  const load = useCallback(
    (signal: AbortSignal) => {
      if (user?.role !== "technician")
        throw new Error("当前角色无权读取任务报价");
      return readTaskQuote(request, id, signal);
    },
    [request, user?.id, user?.role, id],
  );
  return useApiResource(load);
}

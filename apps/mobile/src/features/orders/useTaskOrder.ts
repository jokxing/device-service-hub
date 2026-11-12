import { useCallback } from "react";
import { useNativeSession } from "../auth/sessionContext";
import { useApiResource } from "../../shared/hooks/useApiResource";
import { readTaskOrder } from "./api";
export function useTaskOrder(id: string) {
  const { request, user } = useNativeSession();
  return useApiResource(
    useCallback(
      (signal: AbortSignal) => {
        if (user?.role !== "technician")
          throw new Error("仅可查看本人任务订单");
        return readTaskOrder(request, id, signal);
      },
      [request, user?.id, user?.role, id],
    ),
  );
}

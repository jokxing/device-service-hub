import { useCallback } from "react";
import { useNativeSession } from "../auth/sessionContext";
import { useApiResource } from "../../shared/hooks/useApiResource";
import { readMyPayments } from "./api";
export function useMyPayments(id: string) {
  const { request, user } = useNativeSession();
  return useApiResource(
    useCallback(
      async (signal: AbortSignal) => {
        if (user?.role !== "reporter") throw new Error("仅可读取本人模拟支付");
        return (await readMyPayments(request, id, signal)).payments;
      },
      [request, user?.id, user?.role, id],
    ),
  );
}

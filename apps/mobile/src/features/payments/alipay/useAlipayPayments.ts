import { useCallback } from "react";
import { useNativeSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import { readAlipayPayments } from "./api";
export function useAlipayPayments(id: string) {
  const { request, user } = useNativeSession();
  return useApiResource(
    useCallback(
      (signal: AbortSignal) => {
        if (user?.role !== "reporter") throw new Error("仅可访问本人支付记录");
        return readAlipayPayments(request, id, signal);
      },
      [request, user?.id, user?.role, id],
    ),
  );
}

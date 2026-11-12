import { readMyPayments } from "../payments/api";
import { useCallback } from "react";
import { useNativeSession } from "../auth/sessionContext";
import { useApiResource } from "../../shared/hooks/useApiResource";
import { readMyQuote } from "./api";
import { readMyOrderByTicket } from "../orders/api";
export function useMyQuote(id: string) {
  const { request, user } = useNativeSession();
  const load = useCallback(
    async (signal: AbortSignal) => {
      if (user?.role !== "reporter")
        throw new Error("仅报修用户可查看本人报价");
      const [quote, order] = await Promise.all([
        readMyQuote(request, id, signal),
        readMyOrderByTicket(request, id, signal),
      ]);
      const payments = order.order
        ? (await readMyPayments(request, order.order.id, signal)).payments
        : [];
      return { ...quote, ...order, payments };
    },
    [request, user?.id, user?.role, id],
  );
  return useApiResource(load);
}

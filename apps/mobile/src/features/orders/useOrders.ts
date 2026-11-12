import { getMyTicket } from "../tickets/api";
import { useCallback } from "react";
import { useNativeSession } from "../auth/sessionContext";
import { useApiResource } from "../../shared/hooks/useApiResource";
import { readMyOrder, readMyOrders } from "./api";
export function useOrders(query: string) {
  const { request, user } = useNativeSession();
  return useApiResource(
    useCallback(
      async (signal: AbortSignal) => {
        if (user?.role !== "reporter") throw new Error("仅可查看本人订单");
        return { ...(await readMyOrders(request, query, signal)), query };
      },
      [request, user?.id, user?.role, query],
    ),
  );
}
export function useOrder(id: string) {
  const { request, user } = useNativeSession();
  return useApiResource(
    useCallback(
      async (signal: AbortSignal) => {
        if (user?.role !== "reporter") throw new Error("仅可查看本人订单");
        const order = await readMyOrder(request, id, signal);
        return {
          ...order,
          ticket: await getMyTicket(request, order.ticketId, signal),
        };
      },
      [request, user?.id, user?.role, id],
    ),
  );
}

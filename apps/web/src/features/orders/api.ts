import type {
  ServiceOrderRecord,
  StartOrderInput,
  ServiceOrderPage,
  ServiceOrderDetail,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";
import { orderListQuery } from "@device-service-hub/contracts/order-rules";

export const ordersApi = {
  list: (
    page: number,
    status: ServiceOrderRecord["status"] | undefined,
    signal: AbortSignal,
  ) =>
    apiRequest<ServiceOrderPage>(`/orders?${orderListQuery(page, status)}`, {
      signal,
    }),
  detail: (id: string, signal: AbortSignal) =>
    apiRequest<ServiceOrderDetail>(`/orders/${encodeURIComponent(id)}`, {
      signal,
    }),
  start: (orderId: string, input: StartOrderInput, signal: AbortSignal) =>
    apiRequest<ServiceOrderRecord>(
      `/orders/${encodeURIComponent(orderId)}/start`,
      { method: "POST", body: JSON.stringify(input), signal },
    ),
  byTicket: (ticketId: string, signal: AbortSignal) =>
    apiRequest<{ order: ServiceOrderRecord | null }>(
      `/orders/by-ticket/${encodeURIComponent(ticketId)}`,
      { signal, cache: "no-store" },
    ).then((result) => result.order),
};

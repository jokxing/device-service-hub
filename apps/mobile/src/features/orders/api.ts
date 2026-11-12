import type {
  ServiceOrderRecord,
  CancelOrderInput,
  StartOrderInput,
  ServiceOrderPage,
  ServiceOrderDetail,
} from "@device-service-hub/contracts";
import type {
  AuthenticatedRead,
  AuthenticatedPost,
} from "../../shared/api/http";
export const readMyOrderByTicket = (
  request: AuthenticatedRead,
  id: string,
  signal?: AbortSignal,
) =>
  request<{ order: ServiceOrderRecord | null }>(
    `/mobile/orders/by-ticket/${encodeURIComponent(id)}`,
    signal,
  );

export const readMyOrders = (
  request: AuthenticatedRead,
  query: string,
  signal?: AbortSignal,
) =>
  request<ServiceOrderPage>(
    `/mobile/orders${query ? "?" + query : ""}`,
    signal,
  );
export const readMyOrder = (
  request: AuthenticatedRead,
  id: string,
  signal?: AbortSignal,
) =>
  request<ServiceOrderDetail>(
    `/mobile/orders/${encodeURIComponent(id)}`,
    signal,
  );

export const readTaskOrder = (
  request: AuthenticatedRead,
  id: string,
  signal?: AbortSignal,
) =>
  request<{ order: ServiceOrderRecord | null }>(
    `/mobile/tasks/${encodeURIComponent(id)}/order`,
    signal,
  );
export const startTaskOrder = (
  post: AuthenticatedPost,
  id: string,
  input: StartOrderInput,
  signal?: AbortSignal,
) =>
  post<ServiceOrderRecord>(
    `/mobile/orders/${encodeURIComponent(id)}/start`,
    input,
    signal,
  );

export const cancelMyOrder = (
  post: AuthenticatedPost,
  id: string,
  input: CancelOrderInput,
  signal?: AbortSignal,
) =>
  post<ServiceOrderRecord>(
    `/mobile/orders/${encodeURIComponent(id)}/cancel`,
    input,
    signal,
  );

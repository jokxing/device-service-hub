import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";

export const ordersApi = {
  byTicket: (ticketId: string, signal: AbortSignal) =>
    apiRequest<{ order: ServiceOrderRecord | null }>(
      `/orders/by-ticket/${encodeURIComponent(ticketId)}`,
      { signal, cache: "no-store" },
    ).then((result) => result.order),
};

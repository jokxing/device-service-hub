import type { PaymentRecord } from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";
export const paymentsApi = {
  byOrder: (orderId: string, signal: AbortSignal) =>
    apiRequest<{ payments: PaymentRecord[] }>(
      `/orders/${encodeURIComponent(orderId)}/payments`,
      { signal },
    ).then((r) => r.payments),
};

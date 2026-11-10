import type { PaymentRecord } from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";
export const paymentsApi = {
  completeRefund: (
    orderId: string,
    paymentId: string,
    requestId: string,
    signal: AbortSignal,
  ) =>
    apiRequest<PaymentRecord>(
      `/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}/refund/mock-success`,
      { method: "POST", body: JSON.stringify({ requestId }), signal },
    ),
  byOrder: (orderId: string, signal: AbortSignal) =>
    apiRequest<{ payments: PaymentRecord[] }>(
      `/orders/${encodeURIComponent(orderId)}/payments`,
      { signal },
    ).then((r) => r.payments),
};

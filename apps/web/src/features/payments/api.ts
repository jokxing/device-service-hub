import { apiRequest } from "../../shared/api/http";
import type { AlipaySandboxPaymentRecord } from "@device-service-hub/contracts";
export const sandboxPaymentsApi = {
  list: (orderId: string, signal: AbortSignal) =>
    apiRequest<{ payments: AlipaySandboxPaymentRecord[] }>(
      `/admin/orders/${encodeURIComponent(orderId)}/alipay-sandbox`,
      { signal },
    ).then((r) => r.payments),
  refund: (
    orderId: string,
    paymentId: string,
    action: "submit" | "query",
    signal: AbortSignal,
  ) =>
    apiRequest<AlipaySandboxPaymentRecord>(
      `/orders/${encodeURIComponent(orderId)}/alipay-sandbox/${encodeURIComponent(paymentId)}/refund/${action}`,
      { method: "POST", body: JSON.stringify({}), signal },
    ),
};

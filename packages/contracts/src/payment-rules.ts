import type { PaymentRecord, ServiceOrderRecord } from "./index";
import type { AlipaySandboxPaymentRecord } from "./alipay-sandbox";
export const REFUND_LIMITS = { reason: 500 } as const;
/** UI eligibility; the server independently checks current owner, amount and state. */
export function canRequestMockRefund(
  order: Pick<ServiceOrderRecord, "id" | "status">,
  payment: Pick<PaymentRecord, "orderId" | "status" | "refund">,
) {
  return canRequestFullRefund(order, payment);
}
export function canRequestAlipayRefund(
  order: Pick<ServiceOrderRecord, "id" | "status">,
  payment: Pick<AlipaySandboxPaymentRecord, "orderId" | "status" | "refund">,
) {
  return canRequestFullRefund(order, payment);
}
function canRequestFullRefund(
  order: Pick<ServiceOrderRecord, "id" | "status">,
  payment: { orderId: string; status: string; refund?: unknown },
) {
  return (
    order.id === payment.orderId &&
    order.status === "awaiting_start" &&
    payment.status === "succeeded" &&
    !payment.refund
  );
}

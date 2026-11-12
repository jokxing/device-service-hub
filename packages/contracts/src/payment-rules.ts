import type { PaymentRecord, ServiceOrderRecord } from "./index";
export const REFUND_LIMITS = { reason: 500 } as const;
/** UI eligibility; the server independently checks current owner, amount and state. */
export function canRequestMockRefund(
  order: Pick<ServiceOrderRecord, "id" | "status">,
  payment: Pick<PaymentRecord, "orderId" | "status" | "refund">,
) {
  return (
    order.id === payment.orderId &&
    order.status === "awaiting_start" &&
    payment.status === "succeeded" &&
    !payment.refund
  );
}

import type {
  PaymentRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
export const hasMockSuccess = (payments: PaymentRecord[]) =>
  payments.some((payment) => payment.status === "succeeded");
export const canCreateMockPayment = (
  order: Pick<ServiceOrderRecord, "status">,
  payments: PaymentRecord[],
) =>
  order.status === "awaiting_start" &&
  !payments.some(
    (payment) => payment.status === "pending" || payment.status === "succeeded",
  );
export const canConfirmMockPayment = (
  order: Pick<ServiceOrderRecord, "id" | "status">,
  payment: PaymentRecord,
) =>
  order.id === payment.orderId &&
  order.status === "awaiting_start" &&
  payment.status === "pending";
export function paymentStatusLabel(payment: PaymentRecord) {
  return payment.status === "pending"
    ? "待支付（模拟）"
    : payment.status === "succeeded"
      ? "已成功（模拟）"
      : payment.closeReason === "expired"
        ? "已超时关闭（模拟）"
        : "已关闭（模拟）";
}

import "server-only";
import { reporterPost } from "../../auth/server/commands";
export function createMockPayment(request: Request, orderId: string) {
  return reporterPost(
    request,
    `/orders/${encodeURIComponent(orderId)}/payments`,
    "尚未确认模拟支付单创建结果，可重试，或关闭后刷新查看。",
  );
}

export function confirmMockPayment(
  request: Request,
  orderId: string,
  paymentId: string,
) {
  return reporterPost(
    request,
    `/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}/mock-success`,
    "尚未确认模拟结果，请刷新查单后核对。",
  );
}

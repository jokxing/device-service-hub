import "server-only";
import { reporterPost } from "../../auth/server/commands";
export function createMockPayment(request: Request, orderId: string) {
  return reporterPost(
    request,
    `/orders/${encodeURIComponent(orderId)}/payments`,
    "尚未确认模拟支付单创建结果，可重试，或关闭后刷新查看。",
  );
}

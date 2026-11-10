import "server-only";
import { reporterPost } from "../../auth/server/commands";

export function cancelOrder(request: Request, orderId: string) {
  return reporterPost(
    request,
    `/orders/${encodeURIComponent(orderId)}/cancel`,
    "尚未确认取消结果，可重试相同原因，或关闭后刷新核对订单。",
  );
}

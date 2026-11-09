import "server-only";
import { reporterPost } from "../../auth/server/commands";

export function acceptQuote(request: Request, id: string) {
  return reporterPost(
    request,
    `/tickets/${encodeURIComponent(id)}/quote/accept`,
    "尚未确认报价结果，可重试相同操作，或关闭后刷新核对订单。",
  );
}

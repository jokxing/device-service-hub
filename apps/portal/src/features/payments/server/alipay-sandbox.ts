import "server-only";
import type { AlipaySandboxPaymentRecord } from "@device-service-hub/contracts";
import { reporterGet } from "../../auth/server/resources";
import { reporterPost } from "../../auth/server/commands";
export function getSandboxPayments(id: string) {
  return reporterGet<{
    enabled: boolean;
    payments: AlipaySandboxPaymentRecord[];
  }>(`/orders/${encodeURIComponent(id)}/alipay-sandbox`);
}
export function sandboxCommand(
  request: Request,
  id: string,
  paymentId?: string,
  action?: "checkout" | "query" | "close" | "refund" | "refund/query",
) {
  return reporterPost(
    request,
    `/orders/${encodeURIComponent(id)}/alipay-sandbox${paymentId && action ? `/${encodeURIComponent(paymentId)}/${action}` : ""}`,
    "尚未确认沙箱操作结果，请刷新记录核对；不要另建支付单。",
  );
}

import type { QuoteRecord } from "@device-service-hub/contracts";

export const QUOTE_STATUS_META: Record<
  QuoteRecord["status"],
  { label: string; color: string }
> = {
  pending: { label: "待用户确认", color: "processing" },
  accepted: { label: "已确认", color: "success" },
  rejected: { label: "已拒绝", color: "error" },
};

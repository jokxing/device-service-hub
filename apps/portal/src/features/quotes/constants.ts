import type { QuoteRecord } from "@device-service-hub/contracts";

export const QUOTE_STATUS_LABELS: Record<QuoteRecord["status"], string> = {
  pending: "待确认",
  accepted: "已确认",
  rejected: "已拒绝",
};

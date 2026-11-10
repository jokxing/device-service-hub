import type { ServiceOrderRecord } from "@device-service-hub/contracts";

export const ORDER_STATUS_LABELS: Record<ServiceOrderRecord["status"], string> =
  {
    awaiting_start: "待开工",
    cancelled: "已取消",
  };

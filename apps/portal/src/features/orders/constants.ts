import type { ServiceOrderRecord } from "@device-service-hub/contracts";

export const ORDER_STATUS_LABELS: Record<ServiceOrderRecord["status"], string> =
  {
    awaiting_start: "待开工",
    cancelled: "已取消",
    in_progress: "维修中",
    awaiting_confirmation: "待用户确认",
    completed: "已完成",
  };

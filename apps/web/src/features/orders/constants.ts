import type { ServiceOrderRecord } from "@device-service-hub/contracts";

export const ORDER_STATUS_META: Record<
  ServiceOrderRecord["status"],
  { label: string; color: string }
> = {
  awaiting_start: { label: "待开工", color: "processing" },
  cancelled: { label: "已取消", color: "default" },
  in_progress: { label: "维修中", color: "cyan" },
  awaiting_confirmation: { label: "待用户确认", color: "purple" },
  completed: { label: "已完成", color: "success" },
};

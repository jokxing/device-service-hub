import type { ServiceOrderRecord } from "@device-service-hub/contracts";

export const ORDER_STATUS_META: Record<
  ServiceOrderRecord["status"],
  { label: string; color: string }
> = {
  awaiting_start: { label: "待开工", color: "processing" },
  cancelled: { label: "已取消", color: "default" },
};

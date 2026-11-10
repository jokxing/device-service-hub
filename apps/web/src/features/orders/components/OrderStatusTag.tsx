import { Tag } from "antd";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { ORDER_STATUS_META } from "../constants";
export default function OrderStatusTag({
  status,
}: {
  status: ServiceOrderRecord["status"];
}) {
  const meta = ORDER_STATUS_META[status];
  return <Tag color={meta.color}>{meta.label}</Tag>;
}

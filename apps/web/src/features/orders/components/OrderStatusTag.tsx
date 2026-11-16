import { Tag } from "antd";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { ORDER_STATUS_META } from "../constants";
import styles from "../orders.module.css";

export default function OrderStatusTag({
  status,
}: {
  status: ServiceOrderRecord["status"];
}) {
  const meta = ORDER_STATUS_META[status];
  return (
    <Tag className={styles.statusTag} color={meta.color}>
      <span className={styles.statusDot} />
      {meta.label}
    </Tag>
  );
}

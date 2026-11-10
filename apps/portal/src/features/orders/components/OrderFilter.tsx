"use client";
import { Select } from "antd";
import { useRouter } from "next/navigation";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import {
  ORDER_STATUSES,
  orderListQuery,
} from "@device-service-hub/contracts/order-rules";
import { ORDER_STATUS_LABELS } from "../constants";
import styles from "../orders.module.css";

export default function OrderFilter({
  status,
}: {
  status?: ServiceOrderRecord["status"];
}) {
  const router = useRouter();
  return (
    <div className={styles.filter}>
      <Select
        aria-label="订单状态"
        allowClear
        placeholder="全部订单状态"
        value={status}
        options={ORDER_STATUSES.map((value) => ({
          value,
          label: ORDER_STATUS_LABELS[value],
        }))}
        onChange={(value) => {
          const query = orderListQuery(1, value);
          router.push("/orders" + (query ? "?" + query : ""));
        }}
      />
    </div>
  );
}

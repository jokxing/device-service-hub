import { Descriptions, Tag } from "antd";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDateTime } from "../../../shared/utils/date";
import { ORDER_STATUS_META } from "../constants";
import styles from "../orders.module.css";

export default function OrderSummary({ order }: { order: ServiceOrderRecord }) {
  return (
    <div aria-label="服务订单">
      <div className={styles.row}>
        <strong>{order.code}</strong>
        <Tag color={ORDER_STATUS_META[order.status].color}>
          {ORDER_STATUS_META[order.status].label}
        </Tag>
      </div>
      <Descriptions
        column={1}
        items={[
          {
            key: "revision",
            label: "报价版本",
            children: `第 ${order.quoteRevision} 版`,
          },
          {
            key: "total",
            label: "订单金额",
            children: `¥${formatCents(order.totalCents)}（人民币）`,
          },
          {
            key: "confirmed",
            label: "确认记录",
            children: `${order.confirmedBy.name} · ${formatDateTime(new Date(order.createdAt))}`,
          },
          { key: "payment", label: "支付状态", children: "未接入支付" },
        ]}
      />
      {order.cancellation && (
        <div aria-label="订单取消记录">
          <p className="muted">
            {order.cancellation.actor.name} ·{" "}
            {formatDateTime(new Date(order.cancellation.createdAt))}
          </p>
          <p className={styles.note}>取消原因：{order.cancellation.reason}</p>
        </div>
      )}
    </div>
  );
}

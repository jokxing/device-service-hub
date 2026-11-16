import Link from "next/link";
import type { ServiceOrderSummary } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDate } from "../../../shared/utils/date";
import OrderStatus from "./OrderStatus";
import styles from "../orders.module.css";

export default function OrderCard({
  order,
  search,
}: {
  order: ServiceOrderSummary;
  search: string;
}) {
  return (
    <article className={styles.card} aria-label={order.code}>
      <div className={styles.cardTop}>
        <span className={styles.code}>{order.code}</span>
        <OrderStatus status={order.status} />
      </div>
      <h2 className={styles.title}>{order.ticket.title}</h2>
      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <small>关联工单</small>
          <strong>{order.ticket.code}</strong>
        </div>
        <div className={styles.metaItem}>
          <small>订单金额</small>
          <strong className={styles.amount}>
            ¥{formatCents(order.totalCents)}
          </strong>
        </div>
        <div className={styles.metaItemWide}>
          <small>关联设备</small>
          <strong>
            {order.ticket.device.code} · {order.ticket.device.name}
          </strong>
        </div>
        <div className={styles.metaItemWide}>
          <small>确认时间</small>
          <strong>{formatDate(order.createdAt)}</strong>
        </div>
      </div>
      <Link
        className={styles.action}
        href={`/orders/${order.id}${search ? "?" + search : ""}`}
        prefetch={false}
      >
        查看订单详情 →
      </Link>
    </article>
  );
}

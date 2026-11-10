import Link from "next/link";
import type { ServiceOrderSummary } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDate } from "../../../shared/utils/date";
import { ORDER_STATUS_LABELS } from "../constants";
import styles from "../../../shared/components/PortalPage.module.css";
import quoteStyles from "../../quotes/quotes.module.css";

export default function OrderCard({
  order,
  search,
}: {
  order: ServiceOrderSummary;
  search: string;
}) {
  return (
    <article className={styles.card}>
      <div className={styles.row}>
        <span className={styles.eyebrow}>{order.code}</span>
        <span className={quoteStyles.status}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>
      <h2 className={styles.cardTitle}>{order.ticket.title}</h2>
      <dl className={styles.fields}>
        <dt>关联工单</dt>
        <dd>{order.ticket.code}</dd>
        <dt>关联设备</dt>
        <dd>
          {order.ticket.device.code} · {order.ticket.device.name}
        </dd>
        <dt>订单金额</dt>
        <dd>¥{formatCents(order.totalCents)}（人民币）</dd>
        <dt>确认时间</dt>
        <dd>{formatDate(order.createdAt)}</dd>
      </dl>
      <Link
        href={`/orders/${order.id}${search ? "?" + search : ""}`}
        prefetch={false}
      >
        查看订单详情 →
      </Link>
    </article>
  );
}

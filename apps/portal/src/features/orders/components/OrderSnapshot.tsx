import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDate } from "../../../shared/utils/date";
import QuoteItems from "../../quotes/components/QuoteItems";
import styles from "../../quotes/quotes.module.css";
import pageStyles from "../../../shared/components/PortalPage.module.css";
import { ORDER_STATUS_LABELS } from "../constants";

export default function OrderSnapshot({
  order,
}: {
  order: ServiceOrderRecord;
}) {
  return (
    <article
      className={`${pageStyles.card} ${styles.section}`}
      aria-label="服务订单"
    >
      <div className={styles.row}>
        <h2 className={pageStyles.cardTitle}>服务订单</h2>
        <span className={styles.status}>
          {ORDER_STATUS_LABELS[order.status]}
        </span>
      </div>
      <dl className={pageStyles.fields}>
        <dt>订单编号</dt>
        <dd>{order.code}</dd>
        <dt>报价版本</dt>
        <dd>第 {order.quoteRevision} 版</dd>
        <dt>条目数量</dt>
        <dd>{order.items.length}</dd>
        <dt>确认人</dt>
        <dd>{order.confirmedBy.name}</dd>
        <dt>确认时间</dt>
        <dd>{formatDate(order.createdAt)}</dd>
        <dt>支付状态</dt>
        <dd>未接入支付</dd>
      </dl>
      <QuoteItems items={order.items} />
      <p className={styles.total}>
        订单金额：¥{formatCents(order.totalCents)}（人民币）
      </p>
      <p className={styles.meta}>
        {order.status === "cancelled"
          ? "订单已取消，关联工单已结束。以上保留原确认时的订单快照。"
          : "以上为确认时的订单快照。报价确认不代表付款，维修尚未开始。"}
      </p>
      {order.cancellation && (
        <div aria-label="订单取消记录">
          <p className={styles.meta}>
            {order.cancellation.actor.name} ·{" "}
            {formatDate(order.cancellation.createdAt)}
          </p>
          <p className={styles.note}>取消原因：{order.cancellation.reason}</p>
        </div>
      )}
    </article>
  );
}

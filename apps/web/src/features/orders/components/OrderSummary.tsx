import DetailField from "../../../shared/components/DetailField";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDateTime } from "../../../shared/utils/date";
import OrderStatusTag from "./OrderStatusTag";
import styles from "../orders.module.css";

export default function OrderSummary({ order }: { order: ServiceOrderRecord }) {
  return (
    <div aria-label="服务订单" className={styles.summary}>
      <div className={styles.detailTags}>
        <OrderStatusTag status={order.status} />
      </div>
      <div className={styles.detailGrid}>
        <DetailField label="报价版本">第 {order.quoteRevision} 版</DetailField>
        <DetailField label="订单金额">
          ¥{formatCents(order.totalCents)}（人民币）
        </DetailField>
        <DetailField label="确认人">{order.confirmedBy.name}</DetailField>
        <DetailField label="确认时间">
          {formatDateTime(new Date(order.createdAt))}
        </DetailField>
        {order.start && (
          <section aria-label="订单开工记录" className={styles.embeddedRecord}>
            <DetailField label="开工人">{order.start.actor.name}</DetailField>
            <DetailField label="开工时间">
              {formatDateTime(new Date(order.start.createdAt))}
            </DetailField>
          </section>
        )}
      </div>
      {order.cancellation && (
        <section className={styles.notePanel} aria-label="订单取消记录">
          <h3>取消记录</h3>
          <p className={styles.metaLine}>
            {order.cancellation.actor.name} ·{" "}
            {formatDateTime(new Date(order.cancellation.createdAt))}
          </p>
          <p className={styles.note}>取消原因：{order.cancellation.reason}</p>
        </section>
      )}
    </div>
  );
}

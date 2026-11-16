import gridStyles from "../../../shared/components/DetailGrid.module.css";
import DetailField from "../../../shared/components/DetailField";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDate } from "../../../shared/utils/date";
import QuoteItems from "../../quotes/components/QuoteItems";
import OrderStatus from "./OrderStatus";
import styles from "../orders.module.css";

function statusNote(order: ServiceOrderRecord) {
  if (order.status === "cancelled")
    return "订单已取消，关联工单已结束。以上保留原确认时的订单快照。";
  if (order.status === "completed")
    return "本次维修已由报修用户确认完成。以上保留原订单金额快照，维修完成不代表已付款。";
  if (order.status === "awaiting_confirmation")
    return "维修结果已提交，请核对上方处理记录并确认完成。订单金额快照保持不变。";
  if (order.status === "in_progress")
    return "订单已开工，以上保留原确认时的金额快照。开工不代表已付款。";
  return "以上为确认时的订单快照。报价确认不代表付款，维修尚未开始。";
}

export default function OrderSnapshot({
  order,
}: {
  order: ServiceOrderRecord;
}) {
  return (
    <article className={styles.snapshot} aria-label="服务订单">
      <div className={styles.snapshotHeader}>
        <h2 className={styles.snapshotTitle}>服务订单</h2>
        <OrderStatus status={order.status} />
      </div>
      <div className={styles.snapshotBody}>
        <div className={gridStyles.detailGrid}>
          <DetailField label="订单编号">{order.code}</DetailField>
          <DetailField label="报价版本">{`第 ${order.quoteRevision} 版`}</DetailField>
          <DetailField label="条目数量">
            {String(order.items.length)}
          </DetailField>
          <DetailField label="确认人">{order.confirmedBy.name}</DetailField>
          <DetailField label="确认时间">
            {formatDate(order.createdAt)}
          </DetailField>
          {order.start && (
            <>
              <DetailField label="开工人">{order.start.actor.name}</DetailField>
              <DetailField label="开工时间">
                {formatDate(order.start.createdAt)}
              </DetailField>
            </>
          )}
        </div>
        <section className={styles.notePanel} aria-label="报价条目">
          <h3>报价条目</h3>
          <QuoteItems items={order.items} />
        </section>
        <p className={styles.total}>
          订单金额：¥{formatCents(order.totalCents)}（人民币）
        </p>
        <p className={styles.statusNotice}>{statusNote(order)}</p>
        {order.cancellation && (
          <section className={styles.notePanel} aria-label="订单取消记录">
            <h3>取消记录</h3>
            <p className={styles.metaLine}>
              {order.cancellation.actor.name} ·{" "}
              {formatDate(order.cancellation.createdAt)}
            </p>
            <p className={styles.cancelReason}>
              取消原因：{order.cancellation.reason}
            </p>
          </section>
        )}
      </div>
    </article>
  );
}

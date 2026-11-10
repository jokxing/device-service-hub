import type {
  PaymentRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDate } from "../../../shared/utils/date";
import PaymentActions from "./PaymentActions";
import styles from "../../../shared/components/PortalPage.module.css";
import paymentStyles from "../payments.module.css";
export default function OrderPayments({
  order,
  payments,
}: {
  order: ServiceOrderRecord;
  payments: PaymentRecord[];
}) {
  return (
    <section className={styles.card} aria-label="模拟支付记录">
      <h2 className={styles.cardTitle}>模拟支付单</h2>
      <p className={styles.description}>
        仅用于本地支付流程验证，真实支付未接入；创建记录不代表付款成功。
      </p>
      {payments.length ? (
        payments.map((payment) => (
          <article
            key={payment.id}
            className={paymentStyles.record}
            aria-label="模拟支付单详情"
          >
            <div className={styles.row}>
              <strong>{payment.code}</strong>
              <span>
                {payment.status === "pending"
                  ? "待支付（模拟）"
                  : "已关闭（模拟）"}
              </span>
            </div>
            <dl className={styles.fields}>
              <dt>渠道</dt>
              <dd>本地模拟</dd>
              <dt>金额</dt>
              <dd>¥{formatCents(payment.amountCents)}（人民币）</dd>
              <dt>创建时间</dt>
              <dd>{formatDate(payment.createdAt)}</dd>
              {payment.closedAt && (
                <>
                  <dt>关闭时间</dt>
                  <dd>{formatDate(payment.closedAt)}</dd>
                  <dt>关闭原因</dt>
                  <dd>关联订单已取消</dd>
                </>
              )}
            </dl>
          </article>
        ))
      ) : (
        <>
          <p>尚无模拟支付单。</p>
          <PaymentActions order={order} />
        </>
      )}
    </section>
  );
}

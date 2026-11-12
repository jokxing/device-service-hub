import { canRequestMockRefund } from "@device-service-hub/contracts/payment-rules";
import RequestRefundAction from "./RequestRefundAction";
import MockPaymentAction, { RefreshPayments } from "./MockPaymentAction";
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
      <RefreshPayments />
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
                  : payment.status === "succeeded"
                    ? "已成功（模拟）"
                    : payment.closeReason === "expired"
                      ? "已超时关闭（模拟）"
                      : "已关闭（模拟）"}
              </span>
            </div>
            <dl className={styles.fields}>
              <dt>渠道</dt>
              <dd>本地模拟</dd>
              <dt>金额</dt>
              <dd>¥{formatCents(payment.amountCents)}（人民币）</dd>
              <dt>支付截止时间</dt>
              <dd>{formatDate(payment.expiresAt)}</dd>
              <dt>创建时间</dt>
              <dd>{formatDate(payment.createdAt)}</dd>
              {payment.closedAt && (
                <>
                  <dt>关闭时间</dt>
                  <dd>{formatDate(payment.closedAt)}</dd>
                  <dt>关闭原因</dt>
                  <dd>
                    {payment.closeReason === "expired"
                      ? "支付已超时"
                      : "关联订单已取消"}
                  </dd>
                </>
              )}
              {payment.succeededAt && (
                <>
                  <dt>模拟成功时间</dt>
                  <dd>{formatDate(payment.succeededAt)}</dd>
                </>
              )}
              {payment.refund && (
                <>
                  <dt>模拟退款状态</dt>
                  <dd>
                    {payment.refund.status === "succeeded"
                      ? "退款成功（模拟）"
                      : "申请待处理（模拟）"}
                  </dd>
                  <dt>申请金额</dt>
                  <dd>¥{formatCents(payment.refund.amountCents)}</dd>
                  <dt>申请原因</dt>
                  <dd>{payment.refund.reason}</dd>
                  <dt>申请时间</dt>
                  <dd>{formatDate(payment.refund.createdAt)}</dd>
                  {payment.refund.completion && (
                    <>
                      <dt>处理人</dt>
                      <dd>{payment.refund.completion.actor.name}</dd>
                      <dt>处理时间</dt>
                      <dd>{formatDate(payment.refund.completion.createdAt)}</dd>
                    </>
                  )}
                </>
              )}
            </dl>
            {canRequestMockRefund(order, payment) && (
              <RequestRefundAction payment={payment} />
            )}
            {payment.status === "pending" &&
              order.status === "awaiting_start" && (
                <>
                  <p className={styles.description}>
                    请在截止时间前完成模拟确认
                  </p>
                  <MockPaymentAction payment={payment} />
                </>
              )}
          </article>
        ))
      ) : (
        <>
          <p>尚无模拟支付单。</p>
        </>
      )}
      {!payments.some(
        (p) => p.status === "pending" || p.status === "succeeded",
      ) && <PaymentActions order={order} />}
    </section>
  );
}

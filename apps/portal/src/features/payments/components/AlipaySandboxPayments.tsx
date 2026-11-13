import type {
  AlipaySandboxPaymentRecord,
  ServiceOrderRecord,
  PaymentRecord,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDate } from "../../../shared/utils/date";
import styles from "../../../shared/components/PortalPage.module.css";
import AlipaySandboxActions from "./AlipaySandboxActions";
import RequestRefundAction from "./RequestRefundAction";
import { Tag } from "antd";
import paymentStyles from "../payments.module.css";
export default function AlipaySandboxPayments({
  order,
  payments,
  enabled,
  mockPayments,
}: {
  order: ServiceOrderRecord;
  payments: AlipaySandboxPaymentRecord[];
  enabled: boolean;
  mockPayments: PaymentRecord[];
}) {
  if (!enabled && !payments.length) return null;
  const current = payments.filter((p) => p.status !== "closed");
  const history = payments.filter((p) => p.status === "closed");
  const canPay =
    enabled &&
    !current.length &&
    order.status === "awaiting_start" &&
    !mockPayments.some((p) => p.status !== "closed");
  function renderPayment(payment: AlipaySandboxPaymentRecord) {
    return (
      <article className={paymentStyles.record} key={payment.id}>
        <h3>
          {payment.status === "pending"
            ? "待核实"
            : payment.status === "succeeded"
              ? "已支付"
              : "已关闭"}
        </h3>
        <dl className={styles.fields}>
          <dt>支付编号</dt>
          <dd>{payment.id}</dd>
          <dt>金额</dt>
          <dd>¥{formatCents(payment.amountCents)}</dd>
          <dt>支付截止</dt>
          <dd>{formatDate(payment.expiresAt)}</dd>
          <dt>最近核验</dt>
          <dd>
            {payment.checkedAt ? formatDate(payment.checkedAt) : "尚未查单"}
          </dd>
        </dl>
        {payment.refund && (
          <div aria-label="退款记录">
            <h3>
              {payment.refund.status === "succeeded"
                ? "退款成功"
                : payment.refund.status === "processing"
                  ? "退款处理中"
                  : "退款申请待管理员处理"}
            </h3>
            <p>退款金额：¥{formatCents(payment.refund.amountCents)}</p>
            <p>退款原因：{payment.refund.reason}</p>
            <p>申请时间：{formatDate(payment.refund.createdAt)}</p>
            {payment.refund.succeededAt && (
              <p>成功时间：{formatDate(payment.refund.succeededAt)}</p>
            )}
            <p>
              {payment.refund.status === "succeeded"
                ? "全额退款已确认，关联订单及工单已结束。"
                : "退款申请已提交，当前暂停开工，等待管理员处理。"}
            </p>
          </div>
        )}
        {order.status === "awaiting_start" &&
          payment.status === "succeeded" &&
          !payment.refund && <RequestRefundAction payment={payment} />}
        <AlipaySandboxActions
          orderId={order.id}
          amountCents={payment.amountCents}
          payment={payment}
        />
      </article>
    );
  }
  return (
    <section className={styles.card} aria-label="支付记录">
      <h2 className={styles.cardTitle}>
        支付 <Tag>测试环境</Tag>
      </h2>
      <p className={styles.description}>支付结果以服务端核验为准。</p>
      {canPay && (
        <div className={paymentStyles.primary}>
          <p>当前无待支付记录 · 订单金额 ¥{formatCents(order.totalCents)}</p>
          <AlipaySandboxActions
            orderId={order.id}
            amountCents={order.totalCents}
          />
        </div>
      )}
      {current.map(renderPayment)}
      {!payments.length && !canPay && <p>尚无支付记录。</p>}
      {!current.length && mockPayments.some((p) => p.status !== "closed") && (
        <p>该订单存在历史测试记录，当前不开放新支付。</p>
      )}
      {!!history.length && (
        <details className={paymentStyles.history}>
          <summary>历史支付记录（{history.length}）</summary>
          {history.map(renderPayment)}
        </details>
      )}
    </section>
  );
}

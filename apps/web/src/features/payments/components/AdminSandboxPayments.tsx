import { useCallback } from "react";
import { Alert, Button, Empty, Spin, Tag } from "antd";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import ContentCard from "../../../shared/components/ContentCard";
import { sandboxPaymentsApi } from "../api";
import SandboxRefundActions from "./SandboxRefundActions";
import styles from "../payments.module.css";

export default function AdminSandboxPayments({ orderId }: { orderId: string }) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => sandboxPaymentsApi.list(orderId, signal),
    [orderId],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  return (
    <div className="mt-5">
      <ContentCard
        title="支付与退款"
        extra={
          <Button loading={loading} onClick={refresh}>
            刷新支付记录
          </Button>
        }
      >
        <div className={styles.content} aria-label="管理员支付记录">
          <Tag>测试环境</Tag>
          <p>支付与退款记录分别保留，结果以服务端核验为准。</p>
          {error ? (
            <Alert type="error" showIcon title={error} />
          ) : loading || !data ? (
            <Spin />
          ) : !data.length ? (
            <Empty description="尚无支付记录" />
          ) : (
            data.map((payment) => (
              <article key={payment.id} className={styles.record}>
                <strong>
                  {payment.status === "succeeded"
                    ? "已支付"
                    : payment.status === "closed"
                      ? "已关闭"
                      : "待核实"}{" "}
                  · ¥{formatCents(payment.amountCents)}
                </strong>
                {payment.refund && (
                  <>
                    <p>
                      {payment.refund.status === "succeeded"
                        ? "退款成功"
                        : payment.refund.status === "processing"
                          ? "退款处理中"
                          : "退款申请待处理"}
                    </p>
                    <p>退款原因：{payment.refund.reason}</p>
                    <p>全额退款：¥{formatCents(payment.refund.amountCents)}</p>
                    <SandboxRefundActions
                      key={payment.refund.id}
                      payment={payment}
                    />
                  </>
                )}
              </article>
            ))
          )}
        </div>
      </ContentCard>
    </div>
  );
}

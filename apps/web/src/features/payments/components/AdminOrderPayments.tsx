import { useCallback } from "react";
import { Alert, Button, Descriptions, Empty, Spin, Tag } from "antd";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import { formatDateTime } from "../../../shared/utils/date";
import ContentCard from "../../../shared/components/ContentCard";
import { paymentsApi } from "../api";
import styles from "../payments.module.css";
export default function AdminOrderPayments({ orderId }: { orderId: string }) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => paymentsApi.byOrder(orderId, signal),
    [orderId],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  return (
    <div className="mt-5">
      <ContentCard
        title="模拟支付单"
        extra={
          <Button onClick={refresh} loading={loading}>
            刷新支付记录
          </Button>
        }
      >
        <div className={styles.content} aria-label="模拟支付记录">
          <p className="muted">
            仅记录本地模拟支付意图，真实支付未接入；不代表已收款。
          </p>
          {error ? (
            <Alert type="error" title={error} showIcon />
          ) : loading || !data ? (
            <Spin />
          ) : data.length ? (
            data.map((payment) => (
              <article key={payment.id} className={styles.record}>
                <strong>{payment.code}</strong>
                <Tag
                  color={
                    payment.status === "pending" ? "processing" : "default"
                  }
                >
                  {payment.status === "pending"
                    ? "待支付（模拟）"
                    : "已关闭（模拟）"}
                </Tag>
                <Descriptions
                  column={1}
                  items={[
                    { key: "channel", label: "渠道", children: "本地模拟" },
                    {
                      key: "amount",
                      label: "金额",
                      children: `¥${formatCents(payment.amountCents)}（人民币）`,
                    },
                    {
                      key: "created",
                      label: "创建时间",
                      children: formatDateTime(new Date(payment.createdAt)),
                    },
                    ...(payment.closedAt
                      ? [
                          {
                            key: "closed",
                            label: "关闭时间",
                            children: formatDateTime(
                              new Date(payment.closedAt),
                            ),
                          },
                          {
                            key: "reason",
                            label: "关闭原因",
                            children: "关联订单已取消",
                          },
                        ]
                      : []),
                  ]}
                />
              </article>
            ))
          ) : (
            <Empty description="尚无模拟支付单" />
          )}
        </div>
      </ContentCard>
    </div>
  );
}

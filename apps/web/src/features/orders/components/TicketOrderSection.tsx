import { useCallback } from "react";
import { Alert, Button, Spin } from "antd";
import { useSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import ContentCard from "../../../shared/components/ContentCard";
import { ordersApi } from "../api";
import OrderSummary from "./OrderSummary";
import styles from "../orders.module.css";

export default function TicketOrderSection({
  ticketId,
  version,
}: {
  ticketId: string;
  version: number;
}) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => ordersApi.byTicket(ticketId, signal),
    [ticketId, version],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  if (!loading && !error && !data) return null;
  return (
    <div className="mt-5">
      <ContentCard
        title="服务订单"
        extra={
          <Button onClick={refresh} loading={loading}>
            刷新订单
          </Button>
        }
      >
        <div className={styles.content}>
          {error ? (
            <Alert type="error" showIcon title={error} />
          ) : loading || !data ? (
            <Spin />
          ) : (
            <OrderSummary order={data} />
          )}
        </div>
      </ContentCard>
    </div>
  );
}

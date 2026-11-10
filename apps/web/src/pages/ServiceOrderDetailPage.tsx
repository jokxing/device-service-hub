import { useCallback } from "react";
import { Alert, Button, Spin } from "antd";
import { Link, useParams } from "react-router-dom";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import ContentCard from "../shared/components/ContentCard";
import { ROUTES } from "../app/routes";
import { ordersApi } from "../features/orders/api";
import { useOrderListQuery } from "../features/orders/useOrderListQuery";
import OrderSummary from "../features/orders/components/OrderSummary";
import QuoteItems from "../features/quotes/components/QuoteItems";
import TicketRecordDetails from "../features/tickets/components/TicketRecordDetails";
import styles from "../features/orders/orders.module.css";

function OrderDetailContent() {
  const { id = "" } = useParams();
  const { user, clearSession } = useSession();
  const { search } = useOrderListQuery();
  const load = useCallback(
    (signal: AbortSignal) => ordersApi.detail(id, signal),
    [id],
  );
  const { data, error, loading, refresh } = useApiResource(load, clearSession);
  return (
    <>
      <ServicePageHeader
        title="订单详情"
        description="查看确认时的金额快照、订单状态与处理记录。"
        back={{
          to: ROUTES.serviceOrders + (search ? "?" + search : ""),
          label: "返回订单列表",
        }}
      />
      {error ? (
        <Alert type="error" showIcon title={error} />
      ) : loading || !data ? (
        <Spin>
          <div className="min-h-32" />
        </Spin>
      ) : (
        <>
          <ContentCard
            title={data.code}
            extra={<Button onClick={refresh}>刷新订单</Button>}
          >
            <div className={styles.content}>
              <OrderSummary order={data} />
              <QuoteItems items={data.items} />
            </div>
          </ContentCard>
          <div className="mt-5">
            <ContentCard title="关联工单与处理记录">
              <div className={styles.content}>
                <TicketRecordDetails ticket={data.ticket} />
                <Link
                  className={styles.link}
                  to={
                    user?.role === "technician"
                      ? `${ROUTES.serviceTasks}/${data.ticketId}`
                      : ROUTES.serviceAdminTickets
                  }
                >
                  {user?.role === "technician"
                    ? "前往关联任务"
                    : "查看工单列表"}
                </Link>
              </div>
            </ContentCard>
          </div>
        </>
      )}
    </>
  );
}
export default function ServiceOrderDetailPage() {
  const { user } = useSession();
  const { id } = useParams();
  return user?.role === "admin" || user?.role === "technician" ? (
    <OrderDetailContent key={id} />
  ) : (
    <Alert type="warning" title="请在用户门户查看本人订单" />
  );
}

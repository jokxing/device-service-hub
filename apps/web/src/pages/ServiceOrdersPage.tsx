import { useCallback, useEffect } from "react";
import { Alert, Button, Select, Spin } from "antd";
import { ORDER_STATUSES } from "@device-service-hub/contracts/order-rules";
import { useSession } from "../features/auth/sessionContext";
import { useApiResource } from "../shared/hooks/useApiResource";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import ContentCard from "../shared/components/ContentCard";
import OrdersList from "../features/orders/components/OrdersList";
import { ordersApi } from "../features/orders/api";
import { ORDER_STATUS_META } from "../features/orders/constants";
import { useOrderListQuery } from "../features/orders/useOrderListQuery";
import styles from "../features/orders/orders.module.css";

function OrdersContent() {
  const { user, clearSession } = useSession();
  const { page, status, search, setPage, replacePage, setStatus } =
    useOrderListQuery();
  const load = useCallback(
    (signal: AbortSignal) =>
      ordersApi
        .list(page, status, signal)
        .then((data) => ({ data, query: search })),
    [page, status, search],
  );
  const {
    data: resource,
    error,
    loading,
    refresh,
  } = useApiResource(load, clearSession);
  const data = resource?.query === search ? resource.data : undefined;
  const lastPage = data
    ? Math.max(1, Math.ceil(data.total / data.pageSize))
    : page;
  useEffect(() => {
    if (data && page > lastPage) replacePage(lastPage);
  }, [data, page, lastPage, replacePage]);
  return (
    <>
      <ServicePageHeader
        title="服务订单"
        description={
          user?.role === "admin"
            ? "查看服务订单、金额快照及履约进度。"
            : "仅显示当前分派给你的工单所关联的订单。"
        }
      />
      <ContentCard
        title="订单列表"
        count={data?.total}
        extra={
          <Button onClick={refresh} loading={loading}>
            刷新
          </Button>
        }
      >
        <div className={styles.content}>
          <Select
            aria-label="订单状态"
            placeholder="全部订单状态"
            allowClear
            value={status}
            onChange={setStatus}
            options={ORDER_STATUSES.map((value) => ({
              value,
              label: ORDER_STATUS_META[value].label,
            }))}
            style={{ minWidth: 180 }}
          />
        </div>
        {error ? (
          <Alert type="error" showIcon title={error} className="m-5" />
        ) : loading || !data ? (
          <Spin>
            <div className="min-h-32" />
          </Spin>
        ) : (
          <OrdersList data={data} search={search} onPageChange={setPage} />
        )}
      </ContentCard>
    </>
  );
}
export default function ServiceOrdersPage() {
  const { user } = useSession();
  return user?.role === "admin" || user?.role === "technician" ? (
    <OrdersContent />
  ) : (
    <Alert type="warning" title="请在用户门户查看本人订单" />
  );
}

import { redirect } from "next/navigation";
import {
  orderListQuery,
  readOrderStatus,
} from "@device-service-hub/contracts/order-rules";
import { getMyOrders } from "../../../features/orders/server/queries";
import OrderCard from "../../../features/orders/components/OrderCard";
import OrderFilter from "../../../features/orders/components/OrderFilter";
import { readPage } from "../../../shared/utils/pagination";
import ContentCard from "../../../shared/components/ContentCard";
import PageHeader from "../../../shared/components/PageHeader";
import RefreshButton from "../../../shared/components/RefreshButton";
import RecordPagination from "../../../shared/components/RecordPagination";
import styles from "../../../features/orders/orders.module.css";

export const metadata = { title: "我的订单" };
export default async function MyOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string | string[];
    status?: string | string[];
  }>;
}) {
  const query = await searchParams,
    page = readPage(query.page),
    status = readOrderStatus(query.status),
    search = orderListQuery(page, status);
  const data = await getMyOrders(page, status),
    pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  const href = (next: number) => {
    const s = orderListQuery(next, status);
    return "/orders" + (s ? "?" + s : "");
  };
  if (page > pages) redirect(href(pages));
  return (
    <>
      <PageHeader
        title="我的订单"
        description={`共 ${data.total} 条本人服务订单，查看金额快照与处理进度。`}
      />
      <ContentCard
        title="订单记录"
        count={data.total}
        extra={<RefreshButton />}
      >
        <div className={styles.filterBar}>
          <OrderFilter status={status} />
        </div>
        {data.items.length ? (
          <ul className={styles.list} aria-label="本人订单列表">
            {data.items.map((order) => (
              <li key={order.id}>
                <OrderCard order={order} search={search} />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>暂无符合条件的本人订单。</div>
        )}
        <RecordPagination
          page={page}
          pages={pages}
          label="订单分页"
          hrefForPage={href}
        />
      </ContentCard>
    </>
  );
}

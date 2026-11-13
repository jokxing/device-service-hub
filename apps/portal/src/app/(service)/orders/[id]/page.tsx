import Link from "next/link";
import { notFound } from "next/navigation";
import {
  orderListQuery,
  readOrderStatus,
} from "@device-service-hub/contracts/order-rules";
import { getMyOrderDetail } from "../../../../features/orders/server/queries";
import OrderSnapshot from "../../../../features/orders/components/OrderSnapshot";
import TicketDetails from "../../../../features/tickets/components/TicketDetails";
import PageHeader from "../../../../shared/components/PageHeader";
import { readPage } from "../../../../shared/utils/pagination";
import styles from "../../../../features/orders/orders.module.css";
import { getMyPayments } from "../../../../features/payments/server/queries";
import { getSandboxPayments } from "../../../../features/payments/server/alipay-sandbox";
import AlipaySandboxPayments from "../../../../features/payments/components/AlipaySandboxPayments";
import AlipaySandboxReturnStatus from "../../../../features/payments/components/AlipaySandboxReturnStatus";

export const metadata = { title: "订单详情" };
export default async function MyOrderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    page?: string | string[];
    status?: string | string[];
    paymentReturn?: string | string[];
  }>;
}) {
  const { id } = await params;
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      id,
    )
  )
    notFound();
  const query = await searchParams,
    search = orderListQuery(
      readPage(query.page),
      readOrderStatus(query.status),
    );
  const [order, payments, sandbox] = await Promise.all([
    getMyOrderDetail(id),
    getMyPayments(id),
    getSandboxPayments(id),
  ]);
  return (
    <>
      <PageHeader
        title="订单详情"
        description="查看本次服务的金额快照与处理记录。"
        back={{
          href: "/orders" + (search ? "?" + search : ""),
          label: "返回我的订单",
        }}
      />
      <div className={styles.stack}>
        {query.paymentReturn === "alipay" && (
          <AlipaySandboxReturnStatus key={id} payments={sandbox.payments} />
        )}
        <OrderSnapshot order={order} />
        <AlipaySandboxPayments
          order={order}
          payments={sandbox.payments}
          enabled={sandbox.enabled}
          mockPayments={payments}
        />
        <TicketDetails ticket={order.ticket} />
        <Link href={`/tickets/${order.ticketId}`} prefetch={false}>
          前往关联报修，查看或处理当前进度 →
        </Link>
      </div>
    </>
  );
}

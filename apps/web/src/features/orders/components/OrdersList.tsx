import { Link } from "react-router-dom";
import type {
  ServiceOrderPage,
  ServiceOrderSummary,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import ResponsiveRecordList from "../../../shared/components/ResponsiveRecordList";
import CompactRecordCard from "../../../shared/components/CompactRecordCard";
import { formatDateTime } from "../../../shared/utils/date";
import { ROUTES } from "../../../app/routes";
import OrderStatusTag from "./OrderStatusTag";
import styles from "../orders.module.css";

export default function OrdersList({
  data,
  search,
  onPageChange,
}: {
  data: ServiceOrderPage;
  search: string;
  onPageChange: (page: number) => void;
}) {
  const detail = (order: ServiceOrderSummary) => (
    <Link
      className={styles.link}
      to={`${ROUTES.serviceOrders}/${order.id}${search ? "?" + search : ""}`}
    >
      查看订单
    </Link>
  );
  return (
    <ResponsiveRecordList<ServiceOrderSummary>
      records={data.items}
      pagination={data}
      onPageChange={onPageChange}
      listLabel="服务订单列表"
      unitLabel="订单"
      emptyText="暂无可访问的服务订单"
      scrollX={950}
      renderCard={(order) => (
        <CompactRecordCard
          title={order.ticket.title}
          eyebrow={order.code}
          badge={<OrderStatusTag status={order.status} />}
          fields={[
            { label: "关联工单", value: order.ticket.code },
            { label: "设备", value: order.ticket.device.name },
            { label: "设备位置", value: order.ticket.device.location },
            { label: "订单金额", value: `¥${formatCents(order.totalCents)}` },
            {
              label: "确认时间",
              value: formatDateTime(new Date(order.createdAt)),
            },
          ]}
          actions={detail(order)}
        />
      )}
      columns={[
        {
          title: "订单 / 工单",
          key: "order",
          render: (_, order) => (
            <div>
              {order.code}
              <div className="muted">
                {order.ticket.code} · {order.ticket.title}
              </div>
            </div>
          ),
        },
        {
          title: "关联设备",
          key: "device",
          render: (_, order) => order.ticket.device.name,
        },
        {
          title: "订单状态",
          key: "status",
          render: (_, order) => <OrderStatusTag status={order.status} />,
        },
        {
          title: "金额（元）",
          key: "total",
          render: (_, order) => formatCents(order.totalCents),
        },
        {
          title: "确认时间",
          key: "created",
          render: (_, order) => formatDateTime(new Date(order.createdAt)),
        },
        { title: "操作", key: "actions", render: (_, order) => detail(order) },
      ]}
    />
  );
}

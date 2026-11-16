import cellStyles from "../../../shared/components/RecordCells.module.css";
import { DesktopOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import type {
  ServiceOrderPage,
  ServiceOrderSummary,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import CompactRecordCard from "../../../shared/components/CompactRecordCard";
import cardStyles from "../../../shared/components/CompactRecordCard.module.css";
import ResponsiveRecordList from "../../../shared/components/ResponsiveRecordList";
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
  function detailPath(order: ServiceOrderSummary) {
    return `${ROUTES.serviceOrders}/${order.id}${search ? "?" + search : ""}`;
  }
  return (
    <ResponsiveRecordList<ServiceOrderSummary>
      records={data.items}
      pagination={data}
      onPageChange={onPageChange}
      listLabel="服务订单列表"
      unitLabel="订单"
      emptyText="暂无可访问的服务订单"
      scrollX={1080}
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
          actions={
            <Link className={cardStyles.actionLink} to={detailPath(order)}>
              查看订单
            </Link>
          }
        />
      )}
      columns={[
        {
          title: "订单 / 工单",
          key: "order",
          width: 300,
          render: (_, order) => (
            <Link className={cellStyles["ticket-link"]} to={detailPath(order)}>
              <span className={cellStyles["ticket-number"]}>{order.code}</span>
              <span className={cellStyles["ticket-title"]}>
                {order.ticket.code} · {order.ticket.title}
              </span>
            </Link>
          ),
        },
        {
          title: "关联设备",
          key: "device",
          width: 200,
          render: (_, order) => (
            <div className={cellStyles["device-cell"]}>
              <span className={cellStyles["device-mini"]} aria-hidden="true">
                <DesktopOutlined />
              </span>
              <div>
                <div>{order.ticket.device.name}</div>
                <small>{order.ticket.device.location}</small>
              </div>
            </div>
          ),
        },
        {
          title: "订单状态",
          key: "status",
          width: 120,
          render: (_, order) => <OrderStatusTag status={order.status} />,
        },
        {
          title: "金额（元）",
          key: "total",
          width: 110,
          render: (_, order) => (
            <span className={styles.amount}>
              ¥{formatCents(order.totalCents)}
            </span>
          ),
        },
        {
          title: "确认时间",
          key: "created",
          width: 165,
          render: (_, order) => (
            <span className={cellStyles["date-text"]}>
              {formatDateTime(new Date(order.createdAt))}
            </span>
          ),
        },
        {
          title: "操作",
          key: "actions",
          width: 100,
          render: (_, order) => (
            <Link className={styles.link} to={detailPath(order)}>
              查看订单
            </Link>
          ),
        },
      ]}
    />
  );
}

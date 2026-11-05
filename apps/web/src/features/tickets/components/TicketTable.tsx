import ticketStyles from "../tickets.module.css";
import { Avatar, Button, Empty, Table } from "antd";
import type { TableColumnsType } from "antd";
import { DesktopOutlined } from "@ant-design/icons";
import type { Role } from "../../../shared/types/session";
import { formatShortDateTime } from "../../../shared/utils/date";
import type { Device } from "../../devices/types";
import type { Ticket } from "../types";
import { PRIORITY_LABELS, TICKET_PAGE_SIZE } from "../constants";
import StatusTag from "./StatusTag";
interface Props {
  tickets: Ticket[];
  devices: readonly Device[];
  role: Role;
  page: number;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onAssign: (id: string) => void;
}
export default function TicketTable({
  tickets,
  devices,
  role,
  page,
  onPageChange,
  onView,
  onAssign,
}: Props) {
  const columns: TableColumnsType<Ticket> = [
    {
      title: "工单 / 报修内容",
      key: "title",
      width: 330,
      render: (_, ticket) => (
        <button
          className={ticketStyles["ticket-link"]}
          onClick={() => onView(ticket.id)}
        >
          <span className={ticketStyles["ticket-number"]}>{ticket.id}</span>
          <span className={ticketStyles["ticket-title"]}>{ticket.title}</span>
        </button>
      ),
    },
    {
      title: "关联设备",
      key: "device",
      width: 200,
      render: (_, ticket) => {
        const device = devices.find((item) => item.id === ticket.deviceId);
        return (
          <div className={ticketStyles["device-cell"]}>
            <span className={ticketStyles["device-mini"]}>
              <DesktopOutlined />
            </span>
            <div>
              <div>{device?.name.split(" · ")[0] ?? "设备资料不可用"}</div>
              <small>
                {ticket.deviceId} · {device?.location.split(" · ")[0] ?? "—"}
              </small>
            </div>
          </div>
        );
      },
    },
    {
      title: "状态",
      dataIndex: "status",
      width: 110,
      render: (status: Ticket["status"]) => <StatusTag status={status} />,
    },
    {
      title: "优先级",
      dataIndex: "priority",
      width: 88,
      render: (priority: Ticket["priority"]) => (
        <span
          className={[ticketStyles.priority, ticketStyles[priority]]
            .filter(Boolean)
            .join(" ")}
        >
          <span />
          {PRIORITY_LABELS[priority]}
        </span>
      ),
    },
    {
      title: "维修人员",
      key: "assignee",
      width: 115,
      render: (_, ticket) =>
        ticket.assignee ? (
          <span className={ticketStyles["person"]}>
            <Avatar
              size={23}
              style={{ background: "#edf2fb", color: "#64748b", fontSize: 10 }}
            >
              {ticket.assignee.slice(-2)}
            </Avatar>
            {ticket.assignee}
          </span>
        ) : (
          <span className="muted">待分派</span>
        ),
    },
    {
      title: "报修时间",
      dataIndex: "created",
      width: 135,
      render: (value: string) => (
        <span className={ticketStyles["date-text"]}>
          {formatShortDateTime(value)}
        </span>
      ),
    },
    {
      title: "操作",
      key: "action",
      width: 85,
      fixed: "right",
      render: (_, ticket) =>
        role === "admin" && ticket.status === "pending" ? (
          <Button type="link" size="small" onClick={() => onAssign(ticket.id)}>
            分派
          </Button>
        ) : (
          <Button type="link" size="small" onClick={() => onView(ticket.id)}>
            查看
          </Button>
        ),
    },
  ];
  return (
    <Table<Ticket>
      rowKey="id"
      columns={columns}
      dataSource={tickets}
      scroll={{ x: 1080 }}
      pagination={{
        current: Math.min(
          page,
          Math.max(1, Math.ceil(tickets.length / TICKET_PAGE_SIZE)),
        ),
        pageSize: TICKET_PAGE_SIZE,
        onChange: onPageChange,
        showSizeChanger: false,
        showTotal: (total) => "共 " + total + " 条工单",
        size: "small",
      }}
      locale={{
        emptyText: (
          <Empty
            description="没有符合条件的工单"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
        ),
      }}
    />
  );
}

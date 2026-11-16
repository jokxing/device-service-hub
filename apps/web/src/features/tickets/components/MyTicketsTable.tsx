import cellStyles from "../../../shared/components/RecordCells.module.css";
import { Avatar } from "antd";
import { DesktopOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import type { TicketPage, TicketRecord } from "@device-service-hub/contracts";
import { ROUTES } from "../../../app/routes";
import CompactRecordCard from "../../../shared/components/CompactRecordCard";
import cardStyles from "../../../shared/components/CompactRecordCard.module.css";
import ResponsiveRecordList from "../../../shared/components/ResponsiveRecordList";
import { formatDateTime } from "../../../shared/utils/date";
import { PRIORITY_LABELS } from "../constants";
import styles from "../connected.module.css";
import ticketStyles from "../tickets.module.css";
import StatusTag from "./StatusTag";

interface Props {
  data: TicketPage;
  onPageChange: (page: number) => void;
}

export default function MyTicketsTable({ data, onPageChange }: Props) {
  return (
    <ResponsiveRecordList<TicketRecord>
      records={data.items}
      pagination={data}
      onPageChange={onPageChange}
      listLabel="报修记录"
      unitLabel="报修"
      emptyText="暂无报修记录，可在设备台账发起报修"
      scrollX={1020}
      renderCard={(ticket) => (
        <CompactRecordCard
          eyebrow={ticket.code}
          title={ticket.title}
          badge={<StatusTag status={ticket.status} />}
          fields={[
            { label: "设备", value: ticket.device.name },
            { label: "编号", value: ticket.device.code },
            {
              label: "维修人员",
              value: ticket.assignee?.name ?? "待分派",
            },
            {
              label: "优先级",
              value: (
                <span
                  className={[
                    ticketStyles.priority,
                    ticketStyles[ticket.priority],
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span />
                  {PRIORITY_LABELS[ticket.priority]}
                </span>
              ),
            },
            {
              label: "提交时间",
              value: formatDateTime(new Date(ticket.createdAt)),
            },
          ]}
          actions={
            <Link
              className={cardStyles.actionLink}
              to={ROUTES.serviceTickets + "/" + ticket.id}
            >
              查看详情
            </Link>
          }
        />
      )}
      columns={[
        {
          title: "报修编号 / 问题",
          key: "title",
          width: 300,
          render: (_, ticket) => (
            <Link
              className={cellStyles["ticket-link"]}
              to={ROUTES.serviceTickets + "/" + ticket.id}
            >
              <span className={cellStyles["ticket-number"]}>{ticket.code}</span>
              <span className={cellStyles["ticket-title"]}>{ticket.title}</span>
            </Link>
          ),
        },
        {
          title: "关联设备",
          key: "device",
          width: 200,
          render: (_, ticket) => (
            <div className={cellStyles["device-cell"]}>
              <span className={cellStyles["device-mini"]} aria-hidden="true">
                <DesktopOutlined />
              </span>
              <div>
                <div>{ticket.device.name}</div>
                <small>{ticket.device.code}</small>
              </div>
            </div>
          ),
        },
        {
          title: "状态",
          dataIndex: "status",
          width: 110,
          render: (status) => <StatusTag status={status} />,
        },
        {
          title: "优先级",
          dataIndex: "priority",
          width: 90,
          render: (priority: TicketRecord["priority"]) => (
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
          width: 120,
          render: (_, ticket) =>
            ticket.assignee ? (
              <span className={ticketStyles.person}>
                <Avatar
                  aria-hidden
                  size={23}
                  style={{
                    background: "#edf2fb",
                    color: "#64748b",
                    fontSize: 10,
                  }}
                >
                  {ticket.assignee.name.slice(-2)}
                </Avatar>
                <span>{ticket.assignee.name}</span>
              </span>
            ) : (
              <span className="muted">待分派</span>
            ),
        },
        {
          title: "提交时间",
          dataIndex: "createdAt",
          width: 175,
          render: (value: string) => (
            <span className={cellStyles["date-text"]}>
              {formatDateTime(new Date(value))}
            </span>
          ),
        },
        {
          title: "操作",
          key: "action",
          width: 75,
          render: (_, ticket) => (
            <Link
              className={styles.link}
              to={ROUTES.serviceTickets + "/" + ticket.id}
            >
              查看
            </Link>
          ),
        },
      ]}
    />
  );
}

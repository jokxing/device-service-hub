import cellStyles from "../../../shared/components/RecordCells.module.css";
import { Avatar, Button, Space } from "antd";
import { DesktopOutlined } from "@ant-design/icons";
import type {
  AdminTicketPage,
  AdminTicketRecord,
} from "@device-service-hub/contracts";
import CompactRecordCard from "../../../shared/components/CompactRecordCard";
import ResponsiveRecordList from "../../../shared/components/ResponsiveRecordList";
import { formatDateTime } from "../../../shared/utils/date";
import { PRIORITY_LABELS } from "../constants";
import ticketStyles from "../tickets.module.css";
import StatusTag from "./StatusTag";

interface Props {
  data: AdminTicketPage;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onAssign: (ticket: AdminTicketRecord) => void;
}

function PersonCell({ name }: { name: string }) {
  return (
    <span className={ticketStyles.person}>
      <Avatar
        aria-hidden
        size={23}
        style={{ background: "#edf2fb", color: "#64748b", fontSize: 10 }}
      >
        {name.slice(-2)}
      </Avatar>
      <span>{name}</span>
    </span>
  );
}

function PriorityCell({
  priority,
}: {
  priority: AdminTicketRecord["priority"];
}) {
  return (
    <span
      className={[ticketStyles.priority, ticketStyles[priority]]
        .filter(Boolean)
        .join(" ")}
    >
      <span />
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

export default function AdminTicketsList({
  data,
  onPageChange,
  onView,
  onAssign,
}: Props) {
  function actions(ticket: AdminTicketRecord, compact: boolean) {
    return (
      <Space>
        <Button
          type={compact ? "default" : "link"}
          onClick={() => onView(ticket.id)}
        >
          详情
        </Button>
        {ticket.status === "pending" && (
          <Button
            type={compact ? "primary" : "link"}
            onClick={() => onAssign(ticket)}
          >
            分派
          </Button>
        )}
      </Space>
    );
  }
  return (
    <ResponsiveRecordList<AdminTicketRecord>
      records={data.items}
      pagination={data}
      onPageChange={onPageChange}
      listLabel="管理工单列表"
      unitLabel="工单"
      emptyText="暂无符合条件的工单"
      scrollX={1120}
      renderCard={(ticket) => (
        <CompactRecordCard
          title={ticket.title}
          eyebrow={ticket.code}
          badge={<StatusTag status={ticket.status} />}
          fields={[
            { label: "设备", value: ticket.device.name },
            { label: "报修用户", value: ticket.reporter.name },
            {
              label: "维修人员",
              value: ticket.assignee?.name ?? "待分派",
            },
            {
              label: "优先级",
              value: <PriorityCell priority={ticket.priority} />,
            },
            {
              label: "提交时间",
              value: formatDateTime(new Date(ticket.createdAt)),
            },
          ]}
          actions={actions(ticket, true)}
        />
      )}
      columns={[
        {
          title: "工单 / 问题",
          key: "title",
          width: 280,
          render: (_, ticket) => (
            <button
              type="button"
              className={cellStyles["ticket-link"]}
              onClick={() => onView(ticket.id)}
            >
              <span className={cellStyles["ticket-number"]}>{ticket.code}</span>
              <span className={cellStyles["ticket-title"]}>{ticket.title}</span>
            </button>
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
          title: "报修用户",
          key: "reporter",
          width: 120,
          render: (_, ticket) => <PersonCell name={ticket.reporter.name} />,
        },
        {
          title: "状态",
          key: "status",
          width: 110,
          render: (_, ticket) => <StatusTag status={ticket.status} />,
        },
        {
          title: "优先级",
          key: "priority",
          width: 90,
          render: (_, ticket) => <PriorityCell priority={ticket.priority} />,
        },
        {
          title: "维修人员",
          key: "assignee",
          width: 120,
          render: (_, ticket) =>
            ticket.assignee ? (
              <PersonCell name={ticket.assignee.name} />
            ) : (
              <span className="muted">待分派</span>
            ),
        },
        {
          title: "提交时间",
          key: "createdAt",
          width: 165,
          render: (_, ticket) => (
            <span className={cellStyles["date-text"]}>
              {formatDateTime(new Date(ticket.createdAt))}
            </span>
          ),
        },
        {
          title: "操作",
          key: "actions",
          width: 120,
          render: (_, ticket) => actions(ticket, false),
        },
      ]}
    />
  );
}

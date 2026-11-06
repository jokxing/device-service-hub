import { Button, Empty, Grid, Pagination, Space, Table } from "antd";
import type {
  AdminTicketPage,
  AdminTicketRecord,
} from "@device-service-hub/contracts";
import CompactRecordCard from "../../../shared/components/CompactRecordCard";
import cardStyles from "../../../shared/components/CompactRecordCard.module.css";
import { formatDateTime } from "../../../shared/utils/date";
import { PRIORITY_LABELS } from "../constants";
import StatusTag from "./StatusTag";

interface Props {
  data: AdminTicketPage;
  onPageChange: (page: number) => void;
  onView: (id: string) => void;
  onAssign: (ticket: AdminTicketRecord) => void;
}
export default function AdminTicketsList({
  data,
  onPageChange,
  onView,
  onAssign,
}: Props) {
  const screens = Grid.useBreakpoint();
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
  const pagination = {
    current: data.page,
    pageSize: data.pageSize,
    total: data.total,
    showSizeChanger: false,
    onChange: onPageChange,
  };
  if (!screens.md)
    return (
      <>
        {data.items.length ? (
          <ul className={cardStyles.list} aria-label="管理工单列表">
            {data.items.map((ticket) => (
              <li key={ticket.id}>
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
                      value: PRIORITY_LABELS[ticket.priority],
                    },
                    {
                      label: "提交时间",
                      value: formatDateTime(new Date(ticket.createdAt)),
                    },
                  ]}
                  actions={actions(ticket, true)}
                />
              </li>
            ))}
          </ul>
        ) : (
          <Empty description="暂无符合条件的工单" className="my-6" />
        )}
        <div className={cardStyles.pagination}>
          <span className="muted">共 {data.total} 条工单</span>
          <Pagination simple {...pagination} />
        </div>
      </>
    );
  return (
    <Table<AdminTicketRecord>
      rowKey="id"
      dataSource={data.items}
      scroll={{ x: 1050 }}
      pagination={{ ...pagination, showTotal: (total) => `共 ${total} 条工单` }}
      locale={{ emptyText: "暂无符合条件的工单" }}
      columns={[
        {
          title: "工单 / 问题",
          key: "title",
          width: 270,
          render: (_, ticket) => (
            <div>
              <span className="muted">{ticket.code}</span>
              <div>{ticket.title}</div>
            </div>
          ),
        },
        {
          title: "设备",
          key: "device",
          render: (_, ticket) => (
            <div>
              {ticket.device.name}
              <div className="muted">{ticket.device.code}</div>
            </div>
          ),
        },
        {
          title: "报修用户",
          key: "reporter",
          render: (_, ticket) => ticket.reporter.name,
        },
        {
          title: "状态",
          key: "status",
          render: (_, ticket) => <StatusTag status={ticket.status} />,
        },
        {
          title: "维修人员",
          key: "assignee",
          render: (_, ticket) => ticket.assignee?.name ?? "待分派",
        },
        {
          title: "优先级",
          key: "priority",
          render: (_, ticket) => PRIORITY_LABELS[ticket.priority],
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

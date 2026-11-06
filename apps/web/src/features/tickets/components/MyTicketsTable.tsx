import { Empty, Grid, Pagination, Table } from "antd";
import { Link } from "react-router-dom";
import type { TicketPage, TicketRecord } from "@device-service-hub/contracts";
import { ROUTES } from "../../../app/routes";
import { formatDateTime } from "../../../shared/utils/date";
import { PRIORITY_LABELS } from "../constants";
import StatusTag from "./StatusTag";
import styles from "../connected.module.css";
import CompactRecordCard from "../../../shared/components/CompactRecordCard";
import cardStyles from "../../../shared/components/CompactRecordCard.module.css";

interface Props {
  data: TicketPage;
  onPageChange: (page: number) => void;
}
export default function MyTicketsTable({ data, onPageChange }: Props) {
  const screens = Grid.useBreakpoint();
  if (!screens.md) {
    return (
      <>
        {data.items.length ? (
          <ul className={cardStyles.list} aria-label="报修记录">
            {data.items.map((ticket) => (
              <li key={ticket.id}>
                <CompactRecordCard
                  eyebrow={ticket.code}
                  title={ticket.title}
                  badge={<StatusTag status={ticket.status} />}
                  fields={[
                    { label: "设备", value: ticket.device.name },
                    { label: "编号", value: ticket.device.code },
                    {
                      label: "优先级",
                      value: PRIORITY_LABELS[ticket.priority],
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
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            description="暂无报修记录，可在设备台账发起报修"
            className="my-6"
          />
        )}
        <div className={cardStyles.pagination}>
          <span className="muted">共 {data.total} 条报修</span>
          <Pagination
            simple
            current={data.page}
            pageSize={data.pageSize}
            total={data.total}
            showSizeChanger={false}
            onChange={onPageChange}
          />
        </div>
      </>
    );
  }
  return (
    <Table<TicketRecord>
      rowKey="id"
      dataSource={data.items}
      scroll={{ x: 900 }}
      pagination={{
        current: data.page,
        pageSize: data.pageSize,
        total: data.total,
        showSizeChanger: false,
        onChange: onPageChange,
        showTotal: (total) => `共 ${total} 条报修`,
      }}
      locale={{ emptyText: "暂无报修记录，可在设备台账发起报修" }}
      columns={[
        {
          title: "报修编号 / 问题",
          key: "title",
          width: 300,
          render: (_, ticket) => (
            <div>
              <Link
                className={styles.link}
                to={ROUTES.serviceTickets + "/" + ticket.id}
              >
                {ticket.code}
              </Link>
              <div className="mt-1">{ticket.title}</div>
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
          title: "状态",
          dataIndex: "status",
          width: 100,
          render: (status) => <StatusTag status={status} />,
        },
        {
          title: "优先级",
          dataIndex: "priority",
          width: 90,
          render: (priority: TicketRecord["priority"]) =>
            PRIORITY_LABELS[priority],
        },
        {
          title: "提交时间",
          dataIndex: "createdAt",
          width: 175,
          render: (value: string) => formatDateTime(new Date(value)),
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

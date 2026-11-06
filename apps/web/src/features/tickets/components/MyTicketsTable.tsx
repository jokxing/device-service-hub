import ResponsiveRecordList from "../../../shared/components/ResponsiveRecordList";
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
      )}
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
          title: "维修人员",
          key: "assignee",
          width: 120,
          render: (_, ticket) => ticket.assignee?.name ?? "待分派",
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

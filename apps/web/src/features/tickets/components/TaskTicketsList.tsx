import cellStyles from "../../../shared/components/RecordCells.module.css";
import { Button, Space } from "antd";
import { DesktopOutlined } from "@ant-design/icons";
import { Link } from "react-router-dom";
import type {
  TaskTicketPage,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
import { ROUTES } from "../../../app/routes";
import CompactRecordCard from "../../../shared/components/CompactRecordCard";
import cardStyles from "../../../shared/components/CompactRecordCard.module.css";
import ResponsiveRecordList from "../../../shared/components/ResponsiveRecordList";
import { formatDateTime } from "../../../shared/utils/date";
import { PRIORITY_LABELS } from "../constants";
import styles from "../connected.module.css";
import ticketStyles from "../tickets.module.css";
import { canAcceptTask } from "../taskRules";
import StatusTag from "./StatusTag";

interface Props {
  data: TaskTicketPage;
  onPageChange: (page: number) => void;
  onAccept: (task: TaskTicketRecord) => void;
}

function PriorityCell({
  priority,
}: {
  priority: TaskTicketRecord["priority"];
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

export default function TaskTicketsList({
  data,
  onPageChange,
  onAccept,
}: Props) {
  function actions(task: TaskTicketRecord, compact: boolean) {
    return (
      <Space>
        <Link
          className={compact ? cardStyles.actionLink : styles.link}
          to={ROUTES.serviceTasks + "/" + task.id}
        >
          查看详情
        </Link>
        {canAcceptTask(task) && (
          <Button
            type={compact ? "primary" : "link"}
            aria-label="接单"
            onClick={() => onAccept(task)}
          >
            接单
          </Button>
        )}
      </Space>
    );
  }
  return (
    <ResponsiveRecordList<TaskTicketRecord>
      records={data.items}
      pagination={data}
      onPageChange={onPageChange}
      listLabel="维修任务列表"
      unitLabel="任务"
      emptyText="暂无分派给你的任务"
      scrollX={1080}
      renderCard={(task) => (
        <CompactRecordCard
          title={task.title}
          eyebrow={task.code}
          badge={<StatusTag status={task.status} />}
          fields={[
            { label: "设备", value: task.device.name },
            { label: "位置", value: task.device.location },
            {
              label: "优先级",
              value: <PriorityCell priority={task.priority} />,
            },
            {
              label: "分派时间",
              value: task.assignedAt
                ? formatDateTime(new Date(task.assignedAt))
                : "—",
            },
          ]}
          actions={actions(task, true)}
        />
      )}
      columns={[
        {
          title: "工单 / 问题",
          key: "title",
          width: 280,
          render: (_, task) => (
            <Link
              className={cellStyles["ticket-link"]}
              to={ROUTES.serviceTasks + "/" + task.id}
            >
              <span className={cellStyles["ticket-number"]}>{task.code}</span>
              <span className={cellStyles["ticket-title"]}>{task.title}</span>
            </Link>
          ),
        },
        {
          title: "关联设备",
          key: "device",
          width: 200,
          render: (_, task) => (
            <div className={cellStyles["device-cell"]}>
              <span className={cellStyles["device-mini"]} aria-hidden="true">
                <DesktopOutlined />
              </span>
              <div>
                <div>{task.device.name}</div>
                <small>{task.device.code}</small>
              </div>
            </div>
          ),
        },
        {
          title: "位置",
          key: "location",
          width: 160,
          render: (_, task) => task.device.location,
        },
        {
          title: "状态",
          key: "status",
          width: 110,
          render: (_, task) => <StatusTag status={task.status} />,
        },
        {
          title: "优先级",
          key: "priority",
          width: 90,
          render: (_, task) => <PriorityCell priority={task.priority} />,
        },
        {
          title: "分派时间",
          key: "assignedAt",
          width: 165,
          render: (_, task) => (
            <span className={cellStyles["date-text"]}>
              {task.assignedAt
                ? formatDateTime(new Date(task.assignedAt))
                : "—"}
            </span>
          ),
        },
        {
          title: "操作",
          key: "actions",
          width: 160,
          render: (_, task) => actions(task, false),
        },
      ]}
    />
  );
}

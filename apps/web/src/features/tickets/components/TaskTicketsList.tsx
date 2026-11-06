import ResponsiveRecordList from "../../../shared/components/ResponsiveRecordList";
import { Button, Space } from "antd";
import { Link } from "react-router-dom";
import type {
  TaskTicketPage,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
import { ROUTES } from "../../../app/routes";
import CompactRecordCard from "../../../shared/components/CompactRecordCard";
import cardStyles from "../../../shared/components/CompactRecordCard.module.css";
import { formatDateTime } from "../../../shared/utils/date";
import { PRIORITY_LABELS } from "../constants";
import { canAcceptTask } from "../taskRules";
import StatusTag from "./StatusTag";
import styles from "../connected.module.css";

interface Props {
  data: TaskTicketPage;
  onPageChange: (page: number) => void;
  onAccept: (task: TaskTicketRecord) => void;
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
      scrollX={1050}
      renderCard={(task) => (
        <CompactRecordCard
          title={task.title}
          eyebrow={task.code}
          badge={<StatusTag status={task.status} />}
          fields={[
            { label: "设备", value: task.device.name },
            { label: "位置", value: task.device.location },
            { label: "优先级", value: PRIORITY_LABELS[task.priority] },
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
          width: 260,
          render: (_, task) => (
            <div>
              <span className="muted">{task.code}</span>
              <div>{task.title}</div>
            </div>
          ),
        },
        {
          title: "设备",
          key: "device",
          render: (_, task) => (
            <div>
              {task.device.name}
              <div className="muted">{task.device.code}</div>
            </div>
          ),
        },
        {
          title: "位置",
          key: "location",
          render: (_, task) => task.device.location,
        },
        {
          title: "状态",
          key: "status",
          render: (_, task) => <StatusTag status={task.status} />,
        },
        {
          title: "优先级",
          key: "priority",
          render: (_, task) => PRIORITY_LABELS[task.priority],
        },
        {
          title: "分派时间",
          key: "assignedAt",
          render: (_, task) =>
            task.assignedAt ? formatDateTime(new Date(task.assignedAt)) : "—",
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

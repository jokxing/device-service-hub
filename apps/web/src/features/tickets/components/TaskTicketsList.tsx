import { Button, Empty, Grid, Pagination, Space, Table } from "antd";
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
  const screens = Grid.useBreakpoint();
  const pagination = {
    current: data.page,
    pageSize: data.pageSize,
    total: data.total,
    showSizeChanger: false,
    onChange: onPageChange,
  };
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
  if (!screens.md)
    return (
      <>
        {data.items.length ? (
          <ul className={cardStyles.list} aria-label="维修任务列表">
            {data.items.map((task) => (
              <li key={task.id}>
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
              </li>
            ))}
          </ul>
        ) : (
          <Empty description="暂无分派给你的任务" className="my-6" />
        )}
        <div className={cardStyles.pagination}>
          <span className="muted">共 {data.total} 条任务</span>
          <Pagination simple {...pagination} />
        </div>
      </>
    );
  return (
    <Table<TaskTicketRecord>
      rowKey="id"
      dataSource={data.items}
      scroll={{ x: 1050 }}
      pagination={{ ...pagination, showTotal: (total) => `共 ${total} 条任务` }}
      locale={{ emptyText: "暂无分派给你的任务" }}
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

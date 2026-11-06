import { Alert, Descriptions } from "antd";
import type { TicketRecord } from "@device-service-hub/contracts";
import { formatDateTime } from "../../../shared/utils/date";
import { PRIORITY_LABELS } from "../constants";
import StatusTag from "./StatusTag";
import styles from "../connected.module.css";

export default function TicketRecordDetails({
  ticket,
}: {
  ticket: TicketRecord;
}) {
  return (
    <div className={styles.details}>
      <Descriptions
        column={{ xs: 1, sm: 2 }}
        items={[
          { key: "title", label: "问题标题", children: ticket.title, span: 2 },
          {
            key: "device",
            label: "设备",
            children: ticket.device.code + " · " + ticket.device.name,
          },
          {
            key: "status",
            label: "状态",
            children: <StatusTag status={ticket.status} />,
          },
          { key: "location", label: "位置", children: ticket.device.location },
          {
            key: "priority",
            label: "优先级",
            children: PRIORITY_LABELS[ticket.priority],
          },
          {
            key: "created",
            label: "提交时间",
            children: formatDateTime(new Date(ticket.createdAt)),
            span: 2,
          },
          {
            key: "assignee",
            label: "维修人员",
            children: ticket.assignee?.name ?? "尚未分派",
          },
          ...(ticket.assignedAt
            ? [
                {
                  key: "assignedAt",
                  label: "分派时间",
                  children: formatDateTime(new Date(ticket.assignedAt)),
                },
              ]
            : []),
          ...(ticket.acceptance
            ? [
                {
                  key: "acceptedBy",
                  label: "接单人",
                  children: ticket.acceptance.actor.name,
                },
                {
                  key: "acceptedAt",
                  label: "接单时间",
                  children: formatDateTime(
                    new Date(ticket.acceptance.createdAt),
                  ),
                },
              ]
            : []),
          {
            key: "description",
            label: "问题描述",
            children: (
              <span className="whitespace-pre-wrap break-words">
                {ticket.description}
              </span>
            ),
            span: 2,
          },
          ...(ticket.result
            ? [
                {
                  key: "result",
                  label: "处理说明",
                  children: (
                    <span className="whitespace-pre-wrap break-words">
                      {ticket.result.description}
                    </span>
                  ),
                  span: 2,
                },
                {
                  key: "resultBy",
                  label: "提交人",
                  children: ticket.result.actor.name,
                },
                {
                  key: "resultAt",
                  label: "处理提交时间",
                  children: formatDateTime(new Date(ticket.result.createdAt)),
                },
              ]
            : []),
          ...(ticket.confirmation
            ? [
                {
                  key: "confirmedBy",
                  label: "确认人",
                  children: ticket.confirmation.actor.name,
                },
                {
                  key: "confirmedAt",
                  label: "确认时间",
                  children: formatDateTime(
                    new Date(ticket.confirmation.createdAt),
                  ),
                },
              ]
            : []),
        ]}
      />
      {ticket.status === "pending" && (
        <Alert showIcon type="info" title="报修已提交，等待管理员分派" />
      )}
      {ticket.status === "assigned" && (
        <Alert showIcon type="info" title="已分派维修人员，等待接单" />
      )}
      {ticket.status === "processing" && (
        <Alert showIcon type="info" title="维修人员已接单，正在处理中" />
      )}
      {ticket.status === "confirming" && (
        <Alert showIcon type="info" title="处理结果已提交，等待报修用户确认" />
      )}
      {ticket.status === "completed" && (
        <Alert showIcon type="success" title="报修用户已确认完成，工单已结束" />
      )}
    </div>
  );
}

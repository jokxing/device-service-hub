import DetailField from "../../../shared/components/DetailField";
import { Alert, Tag } from "antd";
import type { TicketRecord } from "@device-service-hub/contracts";
import { formatDateTime } from "../../../shared/utils/date";
import { PRIORITY_LABELS } from "../constants";
import styles from "../connected.module.css";
import ticketStyles from "../tickets.module.css";
import StatusTag from "./StatusTag";

export default function TicketRecordDetails({
  ticket,
}: {
  ticket: TicketRecord;
}) {
  return (
    <div className={styles.details}>
      <div className={ticketStyles["detail-title"]}>
        <h2>{ticket.title}</h2>
        <div className={ticketStyles["detail-tags"]}>
          <StatusTag status={ticket.status} />
          <Tag
            className={ticketStyles["status-tag"]}
            color={ticket.priority === "urgent" ? "red" : "default"}
          >
            {PRIORITY_LABELS[ticket.priority]}
          </Tag>
        </div>
      </div>
      <div className={ticketStyles["detail-grid"]}>
        <DetailField label="关联设备">{ticket.device.name}</DetailField>
        <DetailField label="设备编号">{ticket.device.code}</DetailField>
        <DetailField label="安装位置">{ticket.device.location}</DetailField>
        <DetailField label="维修人员">
          {ticket.assignee?.name ?? "尚未分派"}
        </DetailField>
        <DetailField label="提交时间">
          {formatDateTime(new Date(ticket.createdAt))}
        </DetailField>
        {ticket.assignedAt && (
          <DetailField label="分派时间">
            {formatDateTime(new Date(ticket.assignedAt))}
          </DetailField>
        )}
        {ticket.acceptance && (
          <>
            <DetailField label="接单人">
              {ticket.acceptance.actor.name}
            </DetailField>
            <DetailField label="接单时间">
              {formatDateTime(new Date(ticket.acceptance.createdAt))}
            </DetailField>
          </>
        )}
        {ticket.result && (
          <>
            <DetailField label="结果提交人">
              {ticket.result.actor.name}
            </DetailField>
            <DetailField label="处理提交时间">
              {formatDateTime(new Date(ticket.result.createdAt))}
            </DetailField>
          </>
        )}
        {ticket.confirmation && (
          <>
            <DetailField label="确认人">
              {ticket.confirmation.actor.name}
            </DetailField>
            <DetailField label="确认时间">
              {formatDateTime(new Date(ticket.confirmation.createdAt))}
            </DetailField>
          </>
        )}
      </div>
      <section className={ticketStyles["description-panel"]}>
        <h3 className={ticketStyles["detail-subheading"]}>问题描述</h3>
        <p className={ticketStyles["description-box"]}>{ticket.description}</p>
      </section>
      {ticket.result && (
        <section className={ticketStyles["description-panel"]}>
          <h3 className={ticketStyles["detail-subheading"]}>处理说明</h3>
          <p className={ticketStyles["description-box"]}>
            {ticket.result.description}
          </p>
        </section>
      )}
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

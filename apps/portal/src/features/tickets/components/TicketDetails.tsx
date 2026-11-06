import type { TicketRecord } from "@device-service-hub/contracts";
import { formatDate } from "../../../shared/utils/date";
import styles from "../../../shared/components/PortalPage.module.css";
import ticketStyles from "../tickets.module.css";
import { PRIORITY_LABELS, STATUS_MESSAGES } from "../constants";
import TicketStatus from "./TicketStatus";

export default function TicketDetails({ ticket }: { ticket: TicketRecord }) {
  return (
    <article className={styles.card}>
      <div className={styles.row}>
        <span className={styles.eyebrow}>{ticket.code}</span>
        <TicketStatus status={ticket.status} />
      </div>
      <h2 className={styles.cardTitle}>{ticket.title}</h2>
      <dl className={styles.fields}>
        <dt>关联设备</dt>
        <dd>
          {ticket.device.code} · {ticket.device.name}
        </dd>
        <dt>安装位置</dt>
        <dd>{ticket.device.location}</dd>
        <dt>优先级</dt>
        <dd>{PRIORITY_LABELS[ticket.priority]}</dd>
        <dt>提交时间</dt>
        <dd>{formatDate(ticket.createdAt)}</dd>
        <dt>维修人员</dt>
        <dd>{ticket.assignee?.name ?? "尚未分派"}</dd>
        {ticket.assignedAt && (
          <>
            <dt>分派时间</dt>
            <dd>{formatDate(ticket.assignedAt)}</dd>
          </>
        )}
        {ticket.acceptance && (
          <>
            <dt>接单人</dt>
            <dd>{ticket.acceptance.actor.name}</dd>
            <dt>接单时间</dt>
            <dd>{formatDate(ticket.acceptance.createdAt)}</dd>
          </>
        )}
        <dt>问题描述</dt>
        <dd className={ticketStyles.text}>{ticket.description}</dd>
        {ticket.result && (
          <>
            <dt>处理说明</dt>
            <dd className={ticketStyles.text}>{ticket.result.description}</dd>
            <dt>处理人</dt>
            <dd>{ticket.result.actor.name}</dd>
            <dt>处理时间</dt>
            <dd>{formatDate(ticket.result.createdAt)}</dd>
          </>
        )}
        {ticket.confirmation && (
          <>
            <dt>确认人</dt>
            <dd>{ticket.confirmation.actor.name}</dd>
            <dt>确认时间</dt>
            <dd>{formatDate(ticket.confirmation.createdAt)}</dd>
          </>
        )}
      </dl>
      <p className={styles.notice}>{STATUS_MESSAGES[ticket.status]}</p>
    </article>
  );
}

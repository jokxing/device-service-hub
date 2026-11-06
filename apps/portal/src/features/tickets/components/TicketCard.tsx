import Link from "next/link";
import type { TicketRecord } from "@device-service-hub/contracts";
import { formatDate } from "../../../shared/utils/date";
import styles from "../../../shared/components/PortalPage.module.css";
import { PRIORITY_LABELS } from "../constants";
import TicketStatus from "./TicketStatus";

export default function TicketCard({ ticket }: { ticket: TicketRecord }) {
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
        <dt>优先级</dt>
        <dd>{PRIORITY_LABELS[ticket.priority]}</dd>
        <dt>提交时间</dt>
        <dd>{formatDate(ticket.createdAt)}</dd>
      </dl>
      <Link href={`/tickets/${encodeURIComponent(ticket.id)}`} prefetch={false}>
        查看报修详情 →
      </Link>
    </article>
  );
}

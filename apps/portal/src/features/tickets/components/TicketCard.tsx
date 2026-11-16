import Link from "next/link";
import type { TicketRecord } from "@device-service-hub/contracts";
import { formatDate } from "../../../shared/utils/date";
import TicketPriority from "./TicketPriority";
import TicketStatus from "./TicketStatus";
import styles from "../tickets.module.css";

export default function TicketCard({ ticket }: { ticket: TicketRecord }) {
  return (
    <article className={styles.card} aria-label={ticket.code}>
      <div className={styles.cardTop}>
        <span className={styles.code}>{ticket.code}</span>
        <div className={styles.cardTags}>
          <TicketPriority priority={ticket.priority} />
          <TicketStatus status={ticket.status} />
        </div>
      </div>
      <h2 className={styles.title}>{ticket.title}</h2>
      <div className={styles.metaRow}>
        <div className={styles.metaItem}>
          <small>关联设备</small>
          <strong>
            {ticket.device.code} · {ticket.device.name}
          </strong>
        </div>
        <div className={styles.metaItem}>
          <small>提交时间</small>
          <strong>{formatDate(ticket.createdAt)}</strong>
        </div>
      </div>
      <Link
        className={styles.action}
        href={`/tickets/${encodeURIComponent(ticket.id)}`}
        prefetch={false}
      >
        查看报修详情 →
      </Link>
    </article>
  );
}

import gridStyles from "../../../shared/components/DetailGrid.module.css";
import DetailField from "../../../shared/components/DetailField";
import type { TicketRecord } from "@device-service-hub/contracts";
import { formatDate } from "../../../shared/utils/date";
import ContentCard from "../../../shared/components/ContentCard";
import { STATUS_MESSAGES } from "../constants";
import TicketPriority from "./TicketPriority";
import TicketStatus from "./TicketStatus";
import styles from "../tickets.module.css";

export default function TicketDetails({ ticket }: { ticket: TicketRecord }) {
  return (
    <ContentCard
      title={ticket.code}
      extra={
        <div className={styles.detailExtra}>
          <TicketPriority priority={ticket.priority} />
          <TicketStatus status={ticket.status} />
        </div>
      }
    >
      <div className={styles.detailBody}>
        <h2 className={styles.detailTitle}>{ticket.title}</h2>
        <div className={gridStyles.detailGrid}>
          <DetailField label="关联设备">
            {`${ticket.device.code} · ${ticket.device.name}`}
          </DetailField>
          <DetailField label="安装位置">{ticket.device.location}</DetailField>
          <DetailField label="提交时间">
            {formatDate(ticket.createdAt)}
          </DetailField>
          <DetailField label="维修人员">
            {ticket.assignee?.name ?? "尚未分派"}
          </DetailField>
          {ticket.assignedAt && (
            <DetailField label="分派时间">
              {formatDate(ticket.assignedAt)}
            </DetailField>
          )}
          {ticket.acceptance && (
            <>
              <DetailField label="接单人">
                {ticket.acceptance.actor.name}
              </DetailField>
              <DetailField label="接单时间">
                {formatDate(ticket.acceptance.createdAt)}
              </DetailField>
            </>
          )}
          {ticket.result && (
            <>
              <DetailField label="处理人">
                {ticket.result.actor.name}
              </DetailField>
              <DetailField label="处理时间">
                {formatDate(ticket.result.createdAt)}
              </DetailField>
            </>
          )}
          {ticket.confirmation && (
            <>
              <DetailField label="确认人">
                {ticket.confirmation.actor.name}
              </DetailField>
              <DetailField label="确认时间">
                {formatDate(ticket.confirmation.createdAt)}
              </DetailField>
            </>
          )}
        </div>
        <section className={styles.notePanel}>
          <h3>问题描述</h3>
          <p className={styles.text}>{ticket.description}</p>
        </section>
        {ticket.result && (
          <section className={styles.notePanel}>
            <h3>处理说明</h3>
            <p className={styles.text}>{ticket.result.description}</p>
          </section>
        )}
        <p className={styles.statusNotice}>{STATUS_MESSAGES[ticket.status]}</p>
      </div>
    </ContentCard>
  );
}

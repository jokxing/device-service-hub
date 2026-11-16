import StatusBadge from "../../../shared/components/StatusBadge";
import type { TicketStatus as Status } from "@device-service-hub/contracts";
import { STATUS_LABELS } from "../constants";
import styles from "../tickets.module.css";

const STATUS_TONE: Record<Status, string> = {
  pending: styles.statusPending,
  assigned: styles.statusAssigned,
  processing: styles.statusProcessing,
  confirming: styles.statusConfirming,
  completed: styles.statusCompleted,
  cancelled: styles.statusCancelled,
};

export default function TicketStatus({ status }: { status: Status }) {
  return (
    <StatusBadge className={STATUS_TONE[status]}>
      {STATUS_LABELS[status]}
    </StatusBadge>
  );
}

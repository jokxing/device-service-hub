import type { TicketStatus as Status } from "@device-service-hub/contracts";
import { STATUS_LABELS } from "../constants";
import styles from "../tickets.module.css";
export default function TicketStatus({ status }: { status: Status }) {
  return <span className={styles.status}>{STATUS_LABELS[status]}</span>;
}

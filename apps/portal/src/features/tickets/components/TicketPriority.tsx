import type { TicketPriority as Priority } from "@device-service-hub/contracts";
import { PRIORITY_LABELS } from "../constants";
import styles from "../tickets.module.css";

export default function TicketPriority({ priority }: { priority: Priority }) {
  return (
    <span
      className={`${styles.priority} ${
        priority === "urgent" ? styles.priorityUrgent : styles.priorityNormal
      }`}
    >
      {PRIORITY_LABELS[priority]}
    </span>
  );
}

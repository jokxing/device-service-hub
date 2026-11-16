import StatusBadge from "../../../shared/components/StatusBadge";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { ORDER_STATUS_LABELS } from "../constants";
import styles from "../orders.module.css";

const TONE: Record<ServiceOrderRecord["status"], string> = {
  awaiting_start: styles.statusAwaitingStart,
  cancelled: styles.statusCancelled,
  in_progress: styles.statusInProgress,
  awaiting_confirmation: styles.statusAwaitingConfirmation,
  completed: styles.statusCompleted,
};

export default function OrderStatus({
  status,
}: {
  status: ServiceOrderRecord["status"];
}) {
  return (
    <StatusBadge className={TONE[status]}>
      {ORDER_STATUS_LABELS[status]}
    </StatusBadge>
  );
}

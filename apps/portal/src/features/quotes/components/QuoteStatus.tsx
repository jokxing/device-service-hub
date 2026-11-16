import StatusBadge from "../../../shared/components/StatusBadge";
import type { QuoteRecord } from "@device-service-hub/contracts";
import { QUOTE_STATUS_LABELS } from "../constants";
import styles from "../quotes.module.css";

const TONE: Record<QuoteRecord["status"], string> = {
  pending: styles.statusPending,
  accepted: styles.statusAccepted,
  rejected: styles.statusRejected,
};

export default function QuoteStatus({
  status,
}: {
  status: QuoteRecord["status"];
}) {
  return (
    <StatusBadge className={TONE[status]}>
      {QUOTE_STATUS_LABELS[status]}
    </StatusBadge>
  );
}

import { useState } from "react";
import type { ReporterTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { connectedTicketsApi } from "../api";
import TicketActionSummary from "./TicketActionSummary";
import styles from "../connected.module.css";

interface Props {
  ticket: ReporterTicketRecord;
  onClose: () => void;
  onConfirmed: () => void;
}
export default function ConfirmTicketModal({
  ticket,
  onClose,
  onConfirmed,
}: Props) {
  const { clearSession } = useSession();
  const [requestId] = useState(() => crypto.randomUUID());
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "尚未确认操作结果，可重试，或关闭后刷新报修记录核对。",
  });
  function confirm() {
    return run(
      (signal) =>
        connectedTicketsApi.confirm(
          ticket.id,
          { requestId, expectedVersion: ticket.version },
          signal,
        ),
      onConfirmed,
    );
  }
  return (
    <MutationModal
      title="确认维修完成"
      onSubmit={confirm}
      onClose={onClose}
      okText="确认完成"
      submitting={submitting}
      error={error}
    >
      <TicketActionSummary ticket={ticket} />
      <div className={styles.confirmationResult} aria-label="待确认的处理结果">
        {ticket.result?.description}
      </div>
      <p>
        请核对处理结果与设备实际情况。确认表示本次维修已验收，工单将结束；当前不支持撤销或重新打开。
      </p>
    </MutationModal>
  );
}

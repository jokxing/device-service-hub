"use client";

import { useState } from "react";
import MutationModal from "../../../shared/components/MutationModal";
import { useAuthenticatedMutation } from "../../auth/useAuthenticatedMutation";
import { confirmTicket } from "../api";
import type { ConfirmationTicket } from "../types";
import styles from "../tickets.module.css";

export default function ConfirmTicketModal({
  ticket,
  onClose,
}: {
  ticket: ConfirmationTicket;
  onClose: () => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const { submitting, error, run } = useAuthenticatedMutation(
    "尚未确认操作结果，可重试，或关闭后刷新报修记录核对。",
  );
  function confirm() {
    return run(
      (signal) =>
        confirmTicket(
          ticket.id,
          { requestId, expectedVersion: ticket.version },
          signal,
        ),
      () =>
        window.location.replace(`/tickets/${encodeURIComponent(ticket.id)}`),
    );
  }
  return (
    <MutationModal
      title="确认维修完成"
      okText="确认完成"
      submitting={submitting}
      error={error}
      onSubmit={confirm}
      onClose={onClose}
    >
      <p>
        <strong>
          {ticket.code} · {ticket.title}
        </strong>
      </p>
      <div className={styles.confirmationResult} aria-label="待确认的处理结果">
        {ticket.result?.description}
      </div>
      <p>
        请核对处理结果与设备实际情况。确认表示本次维修已验收，工单将结束；当前不支持撤销或重新打开。
      </p>
    </MutationModal>
  );
}

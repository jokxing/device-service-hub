import { useState } from "react";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { tasksApi } from "../tasks-api";
import TicketActionSummary from "./TicketActionSummary";

interface Props {
  task: TaskTicketRecord;
  onClose: () => void;
  onAccepted: () => void;
}
export default function AcceptTaskModal({ task, onClose, onAccepted }: Props) {
  const { clearSession } = useSession();
  const [requestId] = useState(() => crypto.randomUUID());
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "尚未确认接单结果，可重试，或关闭后刷新任务核对。",
  });
  function accept() {
    return run(
      (signal) =>
        tasksApi.accept(
          task.id,
          { requestId, expectedVersion: task.version },
          signal,
        ),
      onAccepted,
    );
  }
  return (
    <MutationModal
      title="确认接单"
      onSubmit={accept}
      onClose={onClose}
      okText="确认接单"
      submitting={submitting}
      error={error}
    >
      <TicketActionSummary ticket={task} />
      <p>确认后工单进入处理中，接单人和时间将记录在工单详情中。</p>
    </MutationModal>
  );
}

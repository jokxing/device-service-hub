import { useEffect, useRef, useState } from "react";
import { Alert, Modal } from "antd";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { ApiError } from "../../../shared/api/http";
import { tasksApi } from "../tasks-api";

interface Props {
  task: TaskTicketRecord;
  onClose: () => void;
  onAccepted: () => void;
}
export default function AcceptTaskModal({ task, onClose, onAccepted }: Props) {
  const { clearSession } = useSession();
  const [requestId] = useState(() => crypto.randomUUID());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function accept() {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), 15000);
    setSubmitting(true);
    setError("");
    try {
      await tasksApi.accept(
        task.id,
        { requestId, expectedVersion: task.version },
        controller.signal,
      );
      if (!controller.signal.aborted) onAccepted();
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout")
        return;
      if (error instanceof ApiError && error.status === 401) clearSession();
      else
        setError(
          error instanceof ApiError
            ? error.message
            : "尚未确认接单结果，可重试，或关闭后刷新任务核对。",
        );
    } finally {
      window.clearTimeout(timeout);
      activeRequest.current = null;
      if (!controller.signal.aborted || controller.signal.reason === "timeout")
        setSubmitting(false);
    }
  }
  return (
    <Modal
      open
      title="确认接单"
      onOk={accept}
      onCancel={onClose}
      okText="确认接单"
      cancelText="取消"
      confirmLoading={submitting}
      closable={!submitting}
      maskClosable={!submitting}
      cancelButtonProps={{ disabled: submitting }}
      okButtonProps={{ "aria-label": "确认接单", "aria-busy": submitting }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-5" />}
      <p>
        <strong>
          {task.code} · {task.title}
        </strong>
      </p>
      <p>
        {task.device.name} · {task.device.location}
      </p>
      <p>确认后工单进入处理中，接单人和时间将记录在工单详情中。</p>
    </Modal>
  );
}

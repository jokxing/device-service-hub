import { useEffect, useRef, useState } from "react";
import { Alert, Modal } from "antd";
import type { ReporterTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { ApiError } from "../../../shared/api/http";
import { connectedTicketsApi } from "../api";
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
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function confirm() {
    if (activeRequest.current) return;
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), 15000);
    setSubmitting(true);
    setError("");
    try {
      await connectedTicketsApi.confirm(
        ticket.id,
        { requestId, expectedVersion: ticket.version },
        controller.signal,
      );
      if (!controller.signal.aborted) onConfirmed();
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout")
        return;
      if (error instanceof ApiError && error.status === 401) clearSession();
      else
        setError(
          error instanceof ApiError
            ? error.message
            : "尚未确认操作结果，可重试，或关闭后刷新报修记录核对。",
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
      title="确认维修完成"
      onOk={confirm}
      onCancel={() => {
        if (!submitting) onClose();
      }}
      okText="确认完成"
      cancelText="取消"
      confirmLoading={submitting}
      keyboard={!submitting}
      closable={!submitting}
      maskClosable={!submitting}
      cancelButtonProps={{ disabled: submitting }}
      okButtonProps={{ "aria-label": "确认完成", "aria-busy": submitting }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-5" />}
      <p>
        <strong>
          {ticket.code} · {ticket.title}
        </strong>
      </p>
      <p className="muted">
        {ticket.device.name} · {ticket.device.location}
      </p>
      <div className={styles.confirmationResult} aria-label="待确认的处理结果">
        {ticket.result?.description}
      </div>
      <p>
        请核对处理结果与设备实际情况。确认表示本次维修已验收，工单将结束；当前不支持撤销或重新打开。
      </p>
    </Modal>
  );
}

import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, Button, Form, Modal, Select } from "antd";
import type { AdminTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { useApiResource } from "../../../shared/hooks/useApiResource";
import { ApiError } from "../../../shared/api/http";
import { adminTicketsApi } from "../admin-api";

interface Props {
  ticket: AdminTicketRecord;
  onClose: () => void;
  onAssigned: () => void;
}
export default function AssignConnectedTicketModal({
  ticket,
  onClose,
  onAssigned,
}: Props) {
  const { clearSession } = useSession();
  const load = useCallback(
    (signal: AbortSignal) => adminTicketsApi.technicians(signal),
    [],
  );
  const {
    data: technicians,
    error: loadError,
    loading,
    refresh,
  } = useApiResource(load, clearSession);
  const [form] = Form.useForm<{ assigneeId: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const intent = useRef<{ assigneeId: string; requestId: string } | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  async function submit({ assigneeId }: { assigneeId: string }) {
    if (activeRequest.current) return;
    if (intent.current?.assigneeId !== assigneeId)
      intent.current = { assigneeId, requestId: crypto.randomUUID() };
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), 15000);
    setSubmitting(true);
    setError("");
    try {
      await adminTicketsApi.assign(
        ticket.id,
        {
          requestId: intent.current.requestId,
          assigneeId,
          expectedVersion: ticket.version,
        },
        controller.signal,
      );
      if (!controller.signal.aborted) onAssigned();
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout")
        return;
      if (error instanceof ApiError && error.status === 401) clearSession();
      else
        setError(
          error instanceof ApiError
            ? error.message
            : "尚未确认分派结果，可重试相同选择，或关闭后刷新列表核对。",
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
      title="分派维修人员"
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="确认分派"
      cancelText="取消"
      confirmLoading={submitting}
      closable={!submitting}
      maskClosable={!submitting}
      cancelButtonProps={{ disabled: submitting }}
      okButtonProps={{
        disabled: loading || !technicians?.length,
        "aria-label": "确认分派",
        "aria-busy": submitting,
      }}
    >
      <p>
        {ticket.code} · {ticket.title}
      </p>
      <p className="muted">
        {ticket.device.name} · {ticket.device.location}
      </p>
      {loadError && (
        <Alert
          type="error"
          showIcon
          title={loadError}
          action={
            <Button size="small" onClick={refresh}>
              重试
            </Button>
          }
          className="mb-5"
        />
      )}
      {error && <Alert type="error" showIcon title={error} className="mb-5" />}
      {!loading && technicians?.length === 0 && (
        <Alert
          type="warning"
          showIcon
          title="暂无启用的维修人员，暂时无法分派"
          className="mb-5"
        />
      )}
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={submitting || loading}
      >
        <Form.Item
          name="assigneeId"
          label="维修人员"
          rules={[{ required: true, message: "请选择维修人员" }]}
        >
          <Select
            aria-label="维修人员"
            loading={loading}
            placeholder="选择维修人员"
            options={technicians?.map((person) => ({
              value: person.id,
              label: person.name,
            }))}
          />
        </Form.Item>
      </Form>
      <p className="muted">
        首次分派后工单进入待接单，由对应维修人员确认接单；改派暂未开放。
      </p>
    </Modal>
  );
}

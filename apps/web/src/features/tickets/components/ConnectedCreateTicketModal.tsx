import { useEffect, useRef, useState } from "react";
import { Alert, Form, Input, Modal } from "antd";
import type {
  CreateTicketInput,
  DeviceSummary,
  TicketRecord,
} from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { ApiError } from "../../../shared/api/http";
import { connectedTicketsApi } from "../api";
import TicketTextFields from "./TicketTextFields";

type Values = Pick<CreateTicketInput, "title" | "description" | "priority">;
interface Props {
  device: DeviceSummary;
  onClose: () => void;
  onCreated: (ticket: TicketRecord) => void;
}

export default function ConnectedCreateTicketModal({
  device,
  onClose,
  onCreated,
}: Props) {
  const [form] = Form.useForm<Values>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const { clearSession } = useSession();
  const intent = useRef<{ fingerprint: string; requestId: string } | null>(
    null,
  );
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  async function submit(values: Values) {
    if (activeRequest.current) return;
    const payload = {
      deviceId: device.id,
      title: values.title.trim(),
      description: values.description.trim(),
      priority: values.priority,
    };
    const fingerprint = JSON.stringify(payload);
    if (intent.current?.fingerprint !== fingerprint)
      intent.current = { fingerprint, requestId: crypto.randomUUID() };
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), 15000);
    setSubmitting(true);
    setError("");
    try {
      const ticket = await connectedTicketsApi.create(
        { ...payload, requestId: intent.current.requestId },
        controller.signal,
      );
      if (!controller.signal.aborted) onCreated(ticket);
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout")
        return;
      if (error instanceof ApiError && error.status === 401) clearSession();
      else
        setError(
          error instanceof ApiError
            ? error.message
            : "尚未确认提交结果，可重试相同内容，或先查看我的报修。",
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
      title="提交设备报修"
      onCancel={onClose}
      onOk={() => form.submit()}
      okText="提交报修"
      cancelText="取消"
      confirmLoading={submitting}
      closable={!submitting}
      maskClosable={!submitting}
      cancelButtonProps={{ disabled: submitting }}
    >
      {error && <Alert type="error" showIcon title={error} className="mb-5" />}
      <Form<Values>
        form={form}
        layout="vertical"
        onFinish={submit}
        initialValues={{ priority: "normal" }}
        disabled={submitting}
      >
        <Form.Item label="报修设备">
          <Input value={device.code + " · " + device.name} readOnly />
        </Form.Item>
        <TicketTextFields />
      </Form>
      <p className="muted">本阶段支持文字报修，提交后等待管理员分派。</p>
    </Modal>
  );
}

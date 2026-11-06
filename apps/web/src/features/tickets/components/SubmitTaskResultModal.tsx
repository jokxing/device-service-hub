import { useEffect, useRef, useState } from "react";
import { Alert, Form, Input, Modal } from "antd";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { ApiError } from "../../../shared/api/http";
import { tasksApi } from "../tasks-api";
import { TICKET_LIMITS } from "../constants";

interface Props {
  task: TaskTicketRecord;
  onClose: () => void;
  onSubmitted: () => void;
}
export default function SubmitTaskResultModal({
  task,
  onClose,
  onSubmitted,
}: Props) {
  const { clearSession } = useSession();
  const [form] = Form.useForm<{ description: string }>();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const intent = useRef<{ description: string; requestId: string } | null>(
    null,
  );
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);
  async function submit({
    description: rawDescription,
  }: {
    description: string;
  }) {
    if (activeRequest.current) return;
    const description = rawDescription.trim();
    if (intent.current?.description !== description)
      intent.current = { description, requestId: crypto.randomUUID() };
    const controller = new AbortController();
    activeRequest.current = controller;
    const timeout = window.setTimeout(() => controller.abort("timeout"), 15000);
    setSubmitting(true);
    setError("");
    try {
      await tasksApi.submitResult(
        task.id,
        { ...intent.current, expectedVersion: task.version },
        controller.signal,
      );
      if (!controller.signal.aborted) onSubmitted();
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== "timeout")
        return;
      if (error instanceof ApiError && error.status === 401) clearSession();
      else
        setError(
          error instanceof ApiError
            ? error.message
            : "尚未确认提交结果，可重试相同说明，或关闭后刷新任务核对。",
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
      title="提交处理结果"
      onCancel={() => {
        if (!submitting) onClose();
      }}
      onOk={() => form.submit()}
      okText="提交待确认"
      cancelText="取消"
      confirmLoading={submitting}
      closable={!submitting}
      maskClosable={!submitting}
      keyboard={!submitting}
      cancelButtonProps={{ disabled: submitting }}
      okButtonProps={{ "aria-label": "提交待确认", "aria-busy": submitting }}
    >
      <p>
        <strong>
          {task.code} · {task.title}
        </strong>
      </p>
      <p className="muted">
        {task.device.name} · {task.device.location}
      </p>
      {error && <Alert type="error" showIcon title={error} className="mb-5" />}
      <Form
        form={form}
        layout="vertical"
        onFinish={submit}
        disabled={submitting}
      >
        <Form.Item
          name="description"
          label="处理说明"
          rules={[
            { required: true, whitespace: true, message: "请填写处理说明" },
            {
              max: TICKET_LIMITS.result,
              message: `处理说明最多 ${TICKET_LIMITS.result} 字符`,
            },
          ]}
        >
          <Input.TextArea
            aria-label="处理说明"
            rows={6}
            showCount
            maxLength={TICKET_LIMITS.result}
            placeholder="请说明故障原因、处理过程与检查结果"
          />
        </Form.Item>
      </Form>
      <p className="muted">
        提交后由报修用户确认完成，当前不支持修改已提交结果或退回。
      </p>
    </Modal>
  );
}

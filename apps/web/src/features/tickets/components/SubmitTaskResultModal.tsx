import { useRef } from "react";
import { Form, Input } from "antd";
import type { TaskTicketRecord } from "@device-service-hub/contracts";
import { useSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import TicketActionSummary from "./TicketActionSummary";
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
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "尚未确认提交结果，可重试相同说明，或关闭后刷新任务核对。",
  });
  const intent = useRef<{ description: string; requestId: string } | null>(
    null,
  );
  function submit({ description: rawDescription }: { description: string }) {
    const description = rawDescription.trim();
    return run((signal) => {
      if (intent.current?.description !== description)
        intent.current = { description, requestId: crypto.randomUUID() };
      return tasksApi.submitResult(
        task.id,
        { ...intent.current, expectedVersion: task.version },
        signal,
      );
    }, onSubmitted);
  }

  return (
    <MutationModal
      title="提交处理结果"
      okText="提交待确认"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() => form.submit()}
    >
      <TicketActionSummary ticket={task} />
      <Form
        autoComplete="off"
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
            autoComplete="off"
            aria-label="处理说明"
            allowClear
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
    </MutationModal>
  );
}

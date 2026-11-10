import { useRef } from "react";
import { Form, Input } from "antd";
import type { AdminTicketRecord } from "@device-service-hub/contracts";
import { QUOTE_LIMITS } from "@device-service-hub/contracts/quote-rules";
import { useSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import TicketActionSummary from "./TicketActionSummary";
import { adminTicketsApi } from "../admin-api";

export default function RequireQuoteModal({
  ticket,
  onClose,
}: {
  ticket: AdminTicketRecord;
  onClose: () => void;
}) {
  const { clearSession } = useSession();
  const [form] = Form.useForm<{ reason: string }>();
  const intent = useRef<{ reason: string; requestId: string } | null>(null);
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError:
      "尚未确认调整结果，可用相同原因重试，或关闭后核对实际服务方式。",
  });
  function submit({ reason: raw }: { reason: string }) {
    const reason = raw.trim();
    return run((signal) => {
      if (intent.current?.reason !== reason)
        intent.current = { reason, requestId: crypto.randomUUID() };
      return adminTicketsApi.requireQuote(
        ticket.id,
        {
          ...intent.current,
          expectedVersion: ticket.version,
        },
        signal,
      );
    }, onClose);
  }
  return (
    <MutationModal
      title="改为需报价"
      okText="确认改为需报价"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() => form.submit()}
    >
      <TicketActionSummary ticket={ticket} />
      <p>
        将“直接处理”改为“需报价”，保留当前维修人员与接单记录。后续须提交报价、由报修用户确认并生成订单后开工，才能提交处理结果。
      </p>
      <Form
        autoComplete="off"
        form={form}
        layout="vertical"
        disabled={submitting}
        onFinish={submit}
      >
        <Form.Item
          name="reason"
          label="调整原因"
          rules={[
            { required: true, whitespace: true, message: "请填写调整原因" },
            { max: QUOTE_LIMITS.serviceModeReason },
          ]}
        >
          <Input.TextArea
            autoComplete="off"
            aria-label="调整原因"
            rows={3}
            maxLength={QUOTE_LIMITS.serviceModeReason}
            showCount
            allowClear
            placeholder="例如：首次分派误选，实际需要确认维修费用"
          />
        </Form.Item>
      </Form>
      <p className="muted">
        调整会留下操作记录；本入口不支持改回直接处理。关闭后会重新读取实际状态。
      </p>
    </MutationModal>
  );
}

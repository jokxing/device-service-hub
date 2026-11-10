"use client";

import { useRef } from "react";
import { Form, Input } from "antd";
import {
  QUOTE_LIMITS,
  formatCents,
} from "@device-service-hub/contracts/quote-rules";
import MutationModal from "../../../shared/components/MutationModal";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import { rejectQuote } from "../api";
import type { QuoteActionTicket, ConfirmationQuote } from "../types";

export default function RejectQuoteModal({
  ticket,
  quote,
  onClose,
}: {
  ticket: QuoteActionTicket;
  quote: ConfirmationQuote;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{ reason: string }>();
  const intent = useRef<{ reason: string; requestId: string } | null>(null);
  const { submitting, error, run } = useApiMutation(
    "尚未确认拒绝结果，可重试相同原因，或关闭后刷新核对报价。",
    () => window.location.replace("/login"),
  );
  async function submit() {
    let values: { reason: string };
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    const reason = values.reason.trim();
    return run(
      (signal) => {
        if (intent.current?.reason !== reason)
          intent.current = { reason, requestId: crypto.randomUUID() };
        return rejectQuote(
          ticket.id,
          {
            ...intent.current,
            expectedVersion: ticket.version,
            quoteId: quote.id,
            quoteRevision: quote.revision,
          },
          signal,
        );
      },
      () =>
        window.location.replace(`/tickets/${encodeURIComponent(ticket.id)}`),
    );
  }
  return (
    <MutationModal
      title="拒绝维修报价"
      okText="确认拒绝报价"
      submitting={submitting}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <p>
        <strong>
          {ticket.code} · {ticket.title}
        </strong>
      </p>
      <p>
        报价版本：第 {quote.revision} 版 · ¥{formatCents(quote.totalCents)}
        （人民币）
      </p>
      <Form form={form} layout="vertical" disabled={submitting}>
        <Form.Item
          name="reason"
          label="拒绝原因"
          rules={[
            { required: true, whitespace: true, message: "请填写拒绝原因" },
            { max: QUOTE_LIMITS.rejectionReason },
          ]}
        >
          <Input.TextArea
            aria-label="拒绝原因"
            allowClear
            rows={4}
            showCount
            maxLength={QUOTE_LIMITS.rejectionReason}
            placeholder="请说明需要调整的维修项目、价格或其他原因"
          />
        </Form.Item>
      </Form>
      <p>
        拒绝后本版报价不能再确认，不生成服务订单。工单仍在处理中；如需调整方案，请联系服务方。
      </p>
    </MutationModal>
  );
}

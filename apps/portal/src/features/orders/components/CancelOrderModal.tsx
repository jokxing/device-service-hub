"use client";

import { useRef } from "react";
import { Form, Input } from "antd";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { ORDER_LIMITS } from "@device-service-hub/contracts/order-rules";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import MutationModal from "../../../shared/components/MutationModal";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import { cancelOrder } from "../api";
import type { CancellationTicket } from "../types";

export default function CancelOrderModal({
  ticket,
  order,
  onClose,
}: {
  ticket: CancellationTicket;
  order: Pick<ServiceOrderRecord, "id" | "code" | "totalCents">;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{ reason: string }>();
  const intent = useRef<{ reason: string; requestId: string } | null>(null);
  const { submitting, error, run } = useApiMutation(
    "尚未确认取消结果，可重试相同原因，或关闭后刷新核对订单。",
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
        return cancelOrder(
          order.id,
          { ...intent.current, expectedVersion: ticket.version },
          signal,
        );
      },
      () =>
        window.location.replace(`/tickets/${encodeURIComponent(ticket.id)}`),
    );
  }
  return (
    <MutationModal
      title="取消服务订单"
      okText="确认取消订单"
      submitting={submitting}
      error={error}
      onSubmit={submit}
      onClose={onClose}
    >
      <p>
        <strong>
          {order.code} · 关联工单 {ticket.code}
        </strong>
      </p>
      <p>原订单金额：¥{formatCents(order.totalCents)}（人民币）</p>
      <Form form={form} layout="vertical" disabled={submitting}>
        <Form.Item
          name="reason"
          label="取消原因"
          rules={[
            { required: true, whitespace: true, message: "请填写取消原因" },
            { max: ORDER_LIMITS.cancellationReason },
          ]}
        >
          <Input.TextArea
            aria-label="取消原因"
            rows={4}
            showCount
            allowClear
            maxLength={ORDER_LIMITS.cancellationReason}
            placeholder="请说明不再继续本次维修的原因"
          />
        </Form.Item>
      </Form>
      <p>
        确认后订单取消，关联工单同时结束，不能恢复或继续维修。原报价和金额快照保留；当前未接入支付，本操作不涉及扣款或退款。
      </p>
    </MutationModal>
  );
}

"use client";
import { useRef, useState } from "react";
import { Button, Form, Input } from "antd";
import type { PaymentRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { requestMockRefund } from "../api";
function RefundModal({
  payment,
  onClose,
}: {
  payment: PaymentRecord;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{ reason: string }>();
  const intent = useRef<{ requestId: string; reason: string } | null>(null);
  const { submitting, error, run } = useApiMutation(
    "申请结果不明，可用相同原因重试，或关闭后刷新核对。",
    () => window.location.replace("/login"),
  );
  return (
    <MutationModal
      title="申请模拟退款"
      okText="提交模拟退款申请"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() => form.submit()}
    >
      <p>
        {payment.code} · 全额 ¥{formatCents(payment.amountCents)}
      </p>
      <p>
        仅创建待处理申请，不代表退款成功，不发生真实资金退回。提交后暂停开工，后续处理尚未开放。
      </p>
      <Form
        autoComplete="off"
        form={form}
        layout="vertical"
        disabled={submitting}
        onFinish={({ reason: raw }) => {
          const reason = raw.trim();
          if (intent.current?.reason !== reason)
            intent.current = { requestId: crypto.randomUUID(), reason };
          const input = intent.current;
          return run(
            (signal) =>
              requestMockRefund(payment.orderId, payment.id, input, signal),
            onClose,
          );
        }}
      >
        <Form.Item
          name="reason"
          label="退款原因"
          rules={[
            { required: true, whitespace: true, message: "请填写退款原因" },
            { max: 500 },
          ]}
        >
          <Input.TextArea
            autoComplete="off"
            aria-label="退款原因"
            rows={3}
            maxLength={500}
            showCount
            allowClear
          />
        </Form.Item>
      </Form>
    </MutationModal>
  );
}
export default function RequestRefundAction({
  payment,
}: {
  payment: PaymentRecord;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>申请模拟退款</Button>
      {open && (
        <RefundModal
          payment={payment}
          onClose={() => window.location.reload()}
        />
      )}
    </>
  );
}

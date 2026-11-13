"use client";
import { REFUND_LIMITS } from "@device-service-hub/contracts/payment-rules";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button, Form, Input } from "antd";
import type { AlipaySandboxPaymentRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useAuthenticatedMutation } from "../../auth/useAuthenticatedMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { requestSandboxRefund } from "../api";
type RefundPayment = Pick<
  AlipaySandboxPaymentRecord,
  "id" | "orderId" | "amountCents"
> & {
  code?: string;
};
function RefundModal({
  payment,
  onClose,
}: {
  payment: RefundPayment;
  onClose: () => void;
}) {
  const [form] = Form.useForm<{ reason: string }>();
  const intent = useRef<{ requestId: string; reason: string } | null>(null);
  const { submitting, error, run } = useAuthenticatedMutation(
    "申请结果不明，可用相同原因重试，或关闭后刷新核对。",
  );
  return (
    <MutationModal
      title="申请退款"
      okText="提交退款申请"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() => form.submit()}
    >
      <p>
        {payment.code ?? payment.id} · 全额 ¥{formatCents(payment.amountCents)}
      </p>
      <p>提交全额退款申请后暂停开工，由管理员处理，结果以服务端核验为准。</p>
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
          return run<AlipaySandboxPaymentRecord>(
            (signal) =>
              requestSandboxRefund(payment.orderId, payment.id, input, signal),
            onClose,
          );
        }}
      >
        <Form.Item
          name="reason"
          label="退款原因"
          rules={[
            { required: true, whitespace: true, message: "请填写退款原因" },
            { max: REFUND_LIMITS.reason },
          ]}
        >
          <Input.TextArea
            autoComplete="off"
            aria-label="退款原因"
            rows={3}
            maxLength={REFUND_LIMITS.reason}
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
  payment: RefundPayment;
}) {
  const router = useRouter();
  const [refreshing, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button disabled={refreshing} onClick={() => setOpen(true)}>
        申请退款
      </Button>
      {open && (
        <RefundModal
          payment={payment}
          onClose={() => {
            setOpen(false);
            startTransition(() => router.refresh());
          }}
        />
      )}
    </>
  );
}

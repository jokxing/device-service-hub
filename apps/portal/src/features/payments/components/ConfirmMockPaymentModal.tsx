"use client";
import type { PaymentRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { confirmMockPayment } from "../api";
export default function ConfirmMockPaymentModal({
  payment,
  onClose,
}: {
  payment: PaymentRecord;
  onClose: () => void;
}) {
  const { submitting, error, run } = useApiMutation(
    "尚未确认模拟结果，请重试或关闭后刷新查单。",
    () => window.location.replace("/login"),
  );
  return (
    <MutationModal
      title="确认模拟成功"
      okText="确认模拟成功"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() =>
        run(
          (signal) => confirmMockPayment(payment.orderId, payment.id, signal),
          () => window.location.reload(),
        )
      }
    >
      <p>
        <strong>{payment.code}</strong>
      </p>
      <p>金额：¥{formatCents(payment.amountCents)}（人民币）</p>
      <p>
        仅在本地记录模拟成功，不发生真实扣款。成功后不能直接取消订单，退款尚未开放。
      </p>
    </MutationModal>
  );
}

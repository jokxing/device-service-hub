import { useState } from "react";
import { Button } from "antd";
import type { PaymentRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { paymentsApi } from "../api";
function CompleteRefundModal({
  payment,
  onClose,
}: {
  payment: PaymentRecord;
  onClose: () => void;
}) {
  const [requestId] = useState(() => crypto.randomUUID());
  const { clearSession } = useSession();
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "结果不明，请使用同一意图重试，或关闭后刷新核对。",
  });
  return (
    <MutationModal
      title="记录模拟退款成功"
      okText="确认模拟退款成功"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() =>
        run(
          (signal) =>
            paymentsApi.completeRefund(
              payment.orderId,
              payment.id,
              requestId,
              signal,
            ),
          onClose,
        )
      }
    >
      <p>
        {payment.code} · ¥{formatCents(payment.refund?.amountCents ?? 0)}
      </p>
      <p>
        将记录全额模拟退款成功，并结束尚未开工的订单及工单。保留原支付与退款申请记录，不发生真实资金退回。
      </p>
    </MutationModal>
  );
}
export default function CompleteRefundAction({
  payment,
}: {
  payment: PaymentRecord;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>记录模拟退款成功</Button>
      {open && (
        <CompleteRefundModal
          payment={payment}
          onClose={() => window.location.reload()}
        />
      )}
    </>
  );
}

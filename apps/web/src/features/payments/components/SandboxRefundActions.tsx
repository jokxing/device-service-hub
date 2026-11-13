import { useState } from "react";
import { Alert, Button, Space } from "antd";
import type { AlipaySandboxPaymentRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import { sandboxPaymentsApi } from "../api";

export default function SandboxRefundActions({
  payment,
}: {
  payment: AlipaySandboxPaymentRecord;
}) {
  const [open, setOpen] = useState(false);
  const { clearSession } = useSession();
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "退款结果不明，请先查询；重试沿用原退款编号，不另建申请。",
  });
  if (!payment.refund) return null;
  return (
    <>
      <Space wrap>
        {payment.refund.status !== "succeeded" && (
          <Button disabled={submitting} onClick={() => setOpen(true)}>
            {payment.refund.status === "processing"
              ? "按原编号重试退款"
              : "执行退款"}
          </Button>
        )}
        <Button
          loading={submitting}
          onClick={() =>
            run(
              (signal) =>
                sandboxPaymentsApi.refund(
                  payment.orderId,
                  payment.id,
                  "query",
                  signal,
                ),
              () => window.location.reload(),
            )
          }
        >
          查询退款结果
        </Button>
      </Space>
      {!open && error && <Alert title={error} type="error" showIcon />}
      {open && (
        <MutationModal
          title="执行退款"
          okText="确认退款"
          submitting={submitting}
          error={error}
          onClose={() => window.location.reload()}
          onSubmit={() =>
            run(
              (signal) =>
                sandboxPaymentsApi.refund(
                  payment.orderId,
                  payment.id,
                  "submit",
                  signal,
                ),
              () => window.location.reload(),
            )
          }
        >
          <p>
            全额 ¥{formatCents(payment.refund.amountCents)} ·{" "}
            {payment.refund.reason}
          </p>
          <p>
            确认后提交全额退款。仅核验成功后结束未开工订单及工单；结果不明时请先查询，重试沿用原退款编号。
          </p>
        </MutationModal>
      )}
    </>
  );
}

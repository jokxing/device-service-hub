import { useState } from "react";
import type {
  AlipaySandboxPaymentRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { canRequestAlipayRefund } from "@device-service-hub/contracts/payment-rules";
import { useNativeSession } from "../../auth/sessionContext";
import ActionButton from "../../../shared/components/ActionButton";
import RefundRequestForm from "../RefundRequestForm";
import { requestAlipayRefund } from "./api";

export default function RequestAlipayRefundAction({
  order,
  payment,
  disabled,
  reload,
}: {
  order: ServiceOrderRecord;
  payment: AlipaySandboxPaymentRecord;
  disabled: boolean;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { post } = useNativeSession();
  if (!canRequestAlipayRefund(order, payment)) return null;
  return (
    <>
      <ActionButton
        title="申请退款"
        secondary
        disabled={disabled}
        onPress={() => setOpen(true)}
      />
      {open && (
        <RefundRequestForm
          title="申请退款"
          submitText="提交退款申请"
          amountCents={payment.amountCents}
          description="提交后暂停开工，由管理员处理。申请成功不代表退款到账，结果以服务端核验为准。"
          retryHint="结果不明时保留相同原因重试；关闭后重新读取退款记录。取消请求不等于回滚。"
          submitRequest={(input, signal) =>
            requestAlipayRefund(
              post,
              payment.orderId,
              payment.id,
              input,
              signal,
            )
          }
          onClose={() => {
            setOpen(false);
            reload();
          }}
        />
      )}
    </>
  );
}

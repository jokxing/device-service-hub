import { useState } from "react";
import type {
  PaymentRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { canRequestMockRefund } from "@device-service-hub/contracts/payment-rules";
import { useNativeSession } from "../auth/sessionContext";
import ActionButton from "../../shared/components/ActionButton";
import RefundRequestForm from "./RefundRequestForm";
import { requestMockRefund } from "./api";

export default function RequestMockRefundAction({
  order,
  payment,
  reload,
}: {
  order: ServiceOrderRecord;
  payment: PaymentRecord;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  const { post } = useNativeSession();
  if (!canRequestMockRefund(order, payment)) return null;
  return (
    <>
      <ActionButton
        title="申请模拟退款"
        secondary
        onPress={() => setOpen(true)}
      />
      {open && (
        <RefundRequestForm
          title="申请全额模拟退款"
          submitText="提交模拟退款申请"
          amountCents={payment.amountCents}
          code={payment.code}
          description="金额由服务端核对原支付单；提交仅创建待处理申请，不代表退款成功，不发生真实资金退回。申请后暂停开工，由管理员在 Web 处理。"
          retryHint="结果不明时保留相同原因重试；关闭后刷新查询申请记录。关闭请求不等于事务回滚。"
          submitRequest={(input, signal) =>
            requestMockRefund(post, payment.orderId, payment.id, input, signal)
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

import { useState } from "react";
import { Text, View } from "react-native";
import type { PaymentRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../auth/sessionContext";
import ActionButton from "../../shared/components/ActionButton";
import MutationModal from "../../shared/components/MutationModal";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import { typography } from "../../shared/styles/typography";
import { spacing } from "../../shared/theme";
import { confirmMockPayment } from "./api";
function Confirmation({
  payment,
  onClose,
}: {
  payment: PaymentRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession(),
    mutation = useApiMutation();
  return (
    <MutationModal
      title="确认模拟成功"
      submitText="确认模拟成功"
      pending={mutation.pending}
      error={mutation.error}
      onClose={onClose}
      onSubmit={() =>
        mutation.run(
          (signal) =>
            confirmMockPayment(post, payment.orderId, payment.id, signal),
          onClose,
        )
      }
    >
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.text}>{payment.code}</Text>
        <Text style={typography.text}>
          金额：¥{formatCents(payment.amountCents)}（人民币）
        </Text>
        <Text style={typography.muted}>请核对支付单编号与金额</Text>
        <Text style={typography.muted}>
          仅记录本地模拟成功，不发生真实扣款。成功后不能直接取消订单；符合条件时可在订单详情申请模拟退款，由管理员在
          Web 处理。请在截止时间前确认，以服务端结果为准。
        </Text>
        <Text style={typography.muted}>
          结果不明时重试同一支付单，关闭后刷新查单。关闭请求不等于回滚。
        </Text>
      </View>
    </MutationModal>
  );
}
export default function ConfirmMockPaymentAction({
  payment,
  reload,
}: {
  payment: PaymentRecord;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton title="模拟支付成功" onPress={() => setOpen(true)} />
      {open && (
        <Confirmation
          payment={payment}
          onClose={() => {
            setOpen(false);
            reload();
          }}
        />
      )}
    </>
  );
}

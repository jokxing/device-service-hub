import { useRef, useState } from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";
import { randomUUID } from "expo-crypto";
import type {
  PaymentRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import {
  REFUND_LIMITS,
  canRequestMockRefund,
} from "@device-service-hub/contracts/payment-rules";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../auth/sessionContext";
import ActionButton from "../../shared/components/ActionButton";
import MutationModal from "../../shared/components/MutationModal";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import { typography } from "../../shared/styles/typography";
import { colors, fontSizes, radii, spacing } from "../../shared/theme";
import { requestMockRefund } from "./api";
function RefundForm({
  payment,
  onClose,
}: {
  payment: PaymentRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession(),
    mutation = useApiMutation();
  const [reason, setReason] = useState("");
  const intent = useRef<{ reason: string; requestId: string } | null>(null);
  return (
    <MutationModal
      title="申请全额模拟退款"
      submitText="提交模拟退款申请"
      pending={mutation.pending}
      error={mutation.error}
      onClose={onClose}
      onSubmit={() =>
        mutation.run((signal) => {
          const text = reason.trim();
          if (!text || text.length > REFUND_LIMITS.reason)
            throw new Error("请填写有效的退款原因");
          if (intent.current?.reason !== text)
            intent.current = { reason: text, requestId: randomUUID() };
          return requestMockRefund(
            post,
            payment.orderId,
            payment.id,
            intent.current,
            signal,
          );
        }, onClose)
      }
    >
      <View style={styles.content}>
        <View style={styles.summary}>
          <Text style={typography.text}>{payment.code}</Text>
          <Text style={typography.text}>
            全额退款：¥{formatCents(payment.amountCents)}（人民币）
          </Text>
          <Text style={typography.muted}>
            金额由服务端核对原支付单；提交仅创建待处理申请，不代表退款成功，不发生真实资金退回。申请后暂停开工，由管理员在
            Web 处理。
          </Text>
        </View>
        <View style={styles.field}>
          <Text style={typography.text}>退款原因</Text>
          <TextInput
            autoComplete="off"
            importantForAutofill="no"
            accessibilityLabel="退款原因"
            multiline
            textAlignVertical="top"
            value={reason}
            onChangeText={setReason}
            maxLength={REFUND_LIMITS.reason}
            editable={!mutation.pending}
            placeholder="请说明尚未开工时申请退款的原因"
            style={styles.input}
          />
          <Text style={typography.muted}>
            {reason.length} / {REFUND_LIMITS.reason}
          </Text>
        </View>
        <Text style={typography.muted}>
          结果不明时保留相同原因重试；关闭后刷新查询申请记录。关闭请求不等于事务回滚。
        </Text>
      </View>
    </MutationModal>
  );
}
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
  if (!canRequestMockRefund(order, payment)) return null;
  return (
    <>
      <ActionButton
        title="申请模拟退款"
        secondary
        onPress={() => setOpen(true)}
      />
      {open && (
        <RefundForm
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
const styles = StyleSheet.create({
  content: { gap: spacing.sm },
  summary: { gap: spacing.xs },
  field: { gap: spacing.xxs },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    padding: spacing.sm,
    fontSize: fontSizes.input,
    minHeight: 120,
  },
});

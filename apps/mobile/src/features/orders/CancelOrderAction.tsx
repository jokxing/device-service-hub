import { hasMockSuccess } from "../payments/rules";
import { useRef, useState } from "react";
import { Text, TextInput, StyleSheet, View } from "react-native";
import { randomUUID } from "expo-crypto";
import type {
  ReporterTicketRecord,
  ServiceOrderRecord,
  PaymentRecord,
} from "@device-service-hub/contracts";
import {
  canCancelOrder,
  ORDER_LIMITS,
} from "@device-service-hub/contracts/order-rules";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../auth/sessionContext";
import ActionButton from "../../shared/components/ActionButton";
import MutationModal from "../../shared/components/MutationModal";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import { typography } from "../../shared/styles/typography";
import { colors, fontSizes, spacing, radii } from "../../shared/theme";
import { cancelMyOrder } from "./api";
function Cancellation({
  ticket,
  order,
  onClose,
}: {
  ticket: ReporterTicketRecord;
  order: ServiceOrderRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession(),
    mutation = useApiMutation();
  const [reason, setReason] = useState("");
  const intent = useRef<{ reason: string; requestId: string } | null>(null);
  return (
    <MutationModal
      title="取消服务订单"
      submitText="确认取消订单"
      pending={mutation.pending}
      error={mutation.error}
      onClose={onClose}
      onSubmit={() =>
        mutation.run((signal) => {
          const normalized = reason.trim();
          if (
            !normalized ||
            normalized.length > ORDER_LIMITS.cancellationReason
          )
            throw new Error("请填写有效的取消原因");
          if (intent.current?.reason !== normalized)
            intent.current = { reason: normalized, requestId: randomUUID() };
          return cancelMyOrder(
            post,
            order.id,
            { ...intent.current, expectedVersion: ticket.version },
            signal,
          );
        }, onClose)
      }
    >
      <View style={styles.content}>
        <View style={styles.summary}>
          <Text style={typography.text}>
            {order.code} · 关联工单 {ticket.code}
          </Text>
          <Text style={typography.text}>设备名称：{ticket.device.name}</Text>
          <Text style={typography.text}>
            原订单金额：¥{formatCents(order.totalCents)}（人民币）
          </Text>
        </View>
        <View style={styles.field}>
          <Text style={typography.text}>取消原因</Text>
          <TextInput
            autoComplete="off"
            importantForAutofill="no"
            accessibilityLabel="取消原因"
            multiline
            textAlignVertical="top"
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            maxLength={ORDER_LIMITS.cancellationReason}
            editable={!mutation.pending}
            placeholder="请说明不再继续本次维修的原因"
          />
          <Text style={typography.muted}>
            {reason.length} / {ORDER_LIMITS.cancellationReason}
          </Text>
        </View>
        <View style={styles.summary}>
          <Text style={typography.text}>
            取消后订单与工单同时结束，不能恢复或继续维修；保留原报价、金额快照和取消记录。已模拟成功的订单不能直接取消，请在订单详情申请模拟退款。
          </Text>
          <Text style={typography.muted}>
            结果不明时保持原原因重试；关闭后刷新核对，取消请求不等于事务回滚。
          </Text>
        </View>
      </View>
    </MutationModal>
  );
}
export default function CancelOrderAction({
  ticket,
  payments,
  order,
  reload,
}: {
  ticket: ReporterTicketRecord;
  order: ServiceOrderRecord;
  payments: PaymentRecord[];
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!canCancelOrder(ticket, order) || hasMockSuccess(payments)) return null;
  return (
    <>
      <ActionButton title="取消订单" secondary onPress={() => setOpen(true)} />
      {open && (
        <Cancellation
          ticket={ticket}
          order={order}
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

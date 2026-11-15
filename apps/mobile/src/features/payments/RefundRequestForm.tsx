import { useRef, useState } from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";
import { randomUUID } from "expo-crypto";
import { REFUND_LIMITS } from "@device-service-hub/contracts/payment-rules";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import MutationModal from "../../shared/components/MutationModal";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import { typography } from "../../shared/styles/typography";
import { colors, fontSizes, radii, spacing } from "../../shared/theme";

export default function RefundRequestForm({
  title,
  submitText,
  amountCents,
  code,
  description,
  retryHint,
  submitRequest,
  onClose,
}: {
  title: string;
  submitText: string;
  amountCents: number;
  code?: string;
  description: string;
  retryHint: string;
  submitRequest: (
    input: { reason: string; requestId: string },
    signal: AbortSignal,
  ) => Promise<unknown>;
  onClose: () => void;
}) {
  const mutation = useApiMutation();
  const [reason, setReason] = useState("");
  const intent = useRef<{ reason: string; requestId: string } | null>(null);
  return (
    <MutationModal
      title={title}
      submitText={submitText}
      pending={mutation.pending}
      error={mutation.error}
      onClose={onClose}
      onSubmit={() =>
        mutation.run((signal) => {
          const normalized = reason.trim();
          if (!normalized || normalized.length > REFUND_LIMITS.reason)
            throw new Error("请填写有效的退款原因");
          if (intent.current?.reason !== normalized)
            intent.current = { reason: normalized, requestId: randomUUID() };
          return submitRequest(intent.current, signal);
        }, onClose)
      }
    >
      {!!code && <Text style={typography.text}>{code}</Text>}
      <Text style={typography.text}>
        全额退款：¥{formatCents(amountCents)}（人民币）
      </Text>
      <Text style={typography.muted}>{description}</Text>
      <View style={{ gap: spacing.xs }}>
        <Text style={typography.text}>退款原因</Text>
        <TextInput
          accessibilityLabel="退款原因"
          autoComplete="off"
          importantForAutofill="no"
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
      <Text style={typography.muted}>{retryHint}</Text>
    </MutationModal>
  );
}
const styles = StyleSheet.create({
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

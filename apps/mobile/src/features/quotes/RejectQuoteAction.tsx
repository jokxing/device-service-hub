import { useRef, useState } from "react";
import { Text, TextInput, StyleSheet } from "react-native";
import { randomUUID } from "expo-crypto";
import type {
  QuoteRecord,
  ReporterTicketRecord,
} from "@device-service-hub/contracts";
import { QUOTE_LIMITS } from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../auth/sessionContext";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import MutationModal from "../../shared/components/MutationModal";
import ActionButton from "../../shared/components/ActionButton";
import { typography } from "../../shared/styles/typography";
import { colors, fontSizes, radii, spacing } from "../../shared/theme";
import { rejectMyQuote } from "./api";
function RejectForm({
  ticket,
  quote,
  onClose,
}: {
  ticket: ReporterTicketRecord;
  quote: QuoteRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession(),
    mutation = useApiMutation();
  const [reason, setReason] = useState("");
  const intent = useRef<{ reason: string; requestId: string } | null>(null);
  return (
    <MutationModal
      title="拒绝维修报价"
      submitText="提交拒绝原因"
      pending={mutation.pending}
      error={mutation.error}
      onClose={onClose}
      onSubmit={() =>
        mutation.run((signal) => {
          const text = reason.trim();
          if (!text || text.length > QUOTE_LIMITS.rejectionReason)
            throw new Error("请填写有效的拒绝原因");
          if (intent.current?.reason !== text)
            intent.current = { reason: text, requestId: randomUUID() };
          return rejectMyQuote(
            post,
            ticket.id,
            {
              ...intent.current,
              expectedVersion: ticket.version,
              quoteId: quote.id,
              quoteRevision: quote.revision,
            },
            signal,
          );
        }, onClose)
      }
    >
      <Text style={typography.text}>
        {ticket.code} · 第 {quote.revision} 版
      </Text>
      <Text style={typography.text}>拒绝原因</Text>
      <TextInput
        autoComplete="off"
        importantForAutofill="no"
        accessibilityLabel="拒绝原因"
        multiline
        style={styles.input}
        value={reason}
        onChangeText={setReason}
        editable={!mutation.pending}
        maxLength={QUOTE_LIMITS.rejectionReason}
        placeholder="请说明费用或维修方案需要调整的原因"
      />
      <Text style={typography.muted}>
        {reason.length} / {QUOTE_LIMITS.rejectionReason}
      </Text>
      <Text style={typography.muted}>
        拒绝不取消工单、不生成订单；等待维修员发布新版。结果不明时保持原内容重试，关闭后刷新核对。
      </Text>
    </MutationModal>
  );
}
export default function RejectQuoteAction({
  ticket,
  quote,
  reload,
}: {
  ticket: ReporterTicketRecord;
  quote: QuoteRecord;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton title="拒绝报价" secondary onPress={() => setOpen(true)} />
      {open && (
        <RejectForm
          ticket={ticket}
          quote={quote}
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
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: spacing.sm,
    fontSize: fontSizes.input,
    minHeight: 120,
    textAlignVertical: "top",
  },
});

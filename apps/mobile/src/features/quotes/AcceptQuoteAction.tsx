import { useState } from "react";
import { Text } from "react-native";
import { randomUUID } from "expo-crypto";
import type {
  QuoteRecord,
  ReporterTicketRecord,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../auth/sessionContext";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import MutationModal from "../../shared/components/MutationModal";
import ActionButton from "../../shared/components/ActionButton";
import { typography } from "../../shared/styles/typography";
import { acceptMyQuote } from "./api";
function AcceptForm({
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
  const [input] = useState(() => ({
    requestId: randomUUID(),
    expectedVersion: ticket.version,
    quoteId: quote.id,
    quoteRevision: quote.revision,
  }));
  return (
    <MutationModal
      title="确认维修报价"
      submitText="确认报价并生成订单"
      pending={mutation.pending}
      error={mutation.error}
      onClose={onClose}
      onSubmit={() =>
        mutation.run(
          (signal) => acceptMyQuote(post, ticket.id, input, signal),
          onClose,
        )
      }
    >
      <Text style={typography.text}>
        {ticket.code} · 第 {input.quoteRevision} 版
      </Text>
      <Text style={typography.text}>
        确认金额：¥{formatCents(quote.totalCents)}（人民币）
      </Text>
      <Text style={typography.muted}>请核对维修项目与数量。</Text>
      <Text style={typography.muted}>
        确认后保存本版本条目与金额快照并生成服务订单，不代表付款或维修已开工。结果不明时保留原意图重试，关闭后读取实际记录。
      </Text>
    </MutationModal>
  );
}
export default function AcceptQuoteAction({
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
      <ActionButton title="确认报价" onPress={() => setOpen(true)} />
      {open && (
        <AcceptForm
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

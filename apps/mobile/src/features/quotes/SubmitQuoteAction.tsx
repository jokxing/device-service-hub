import { useRef, useState } from "react";
import { Text, TextInput, View, StyleSheet } from "react-native";
import { randomUUID } from "expo-crypto";
import type {
  QuoteRecord,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
import {
  calculateQuote,
  formatCents,
  QUOTE_LIMITS,
} from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../auth/sessionContext";
import ActionButton from "../../shared/components/ActionButton";
import MutationModal from "../../shared/components/MutationModal";
import { useApiMutation } from "../../shared/hooks/useApiMutation";
import { typography } from "../../shared/styles/typography";
import { colors, fontSizes, spacing, radii } from "../../shared/theme";
import { normalizeQuoteItems } from "./quoteForm";
import type { QuoteDraftItem } from "./quoteForm";
import { submitTaskQuote, reviseTaskQuote } from "./api";
const blank = (): QuoteDraftItem => ({
  id: randomUUID(),
  name: "",
  quantity: "1",
  price: "",
  note: "",
});
function QuoteForm({
  task,
  baseQuote,
  onClose,
}: {
  task: TaskTicketRecord;
  baseQuote?: QuoteRecord;
  onClose: () => void;
}) {
  const { post } = useNativeSession(),
    mutation = useApiMutation();
  const [items, setItems] = useState<QuoteDraftItem[]>(() =>
    baseQuote
      ? baseQuote.items.map((item) => ({
          id: randomUUID(),
          name: item.name,
          quantity: String(item.quantity),
          price: formatCents(item.unitPriceCents),
          note: item.note ?? "",
        }))
      : [blank()],
  );
  const intent = useRef<{ fingerprint: string; requestId: string } | null>(
    null,
  );
  function change(
    id: string,
    key: keyof Omit<QuoteDraftItem, "id">,
    value: string,
  ) {
    setItems((rows) =>
      rows.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  }
  let estimate = "填写有效条目后显示预估合计";
  try {
    estimate =
      "预估合计：¥" +
      formatCents(calculateQuote(normalizeQuoteItems(items)).totalCents);
  } catch {}
  function submit() {
    mutation.run((signal) => {
      const normalized = normalizeQuoteItems(items),
        fingerprint = JSON.stringify({
          items: normalized,
          baseQuoteId: baseQuote?.id,
          baseQuoteRevision: baseQuote?.revision,
        });
      if (intent.current?.fingerprint !== fingerprint)
        intent.current = { fingerprint, requestId: randomUUID() };
      const input = {
        requestId: intent.current.requestId,
        expectedVersion: task.version,
        items: normalized,
      };
      if (baseQuote)
        return reviseTaskQuote(
          post,
          task.id,
          {
            ...input,
            baseQuoteId: baseQuote.id,
            baseQuoteRevision: baseQuote.revision,
          },
          signal,
        );
      return submitTaskQuote(post, task.id, input, signal);
    }, onClose);
  }
  return (
    <MutationModal
      title={baseQuote ? "修订维修报价" : "编制维修报价"}
      submitText="提交报价"
      pending={mutation.pending}
      error={mutation.error}
      onSubmit={submit}
      onClose={onClose}
    >
      <Text style={typography.text}>
        {task.code} · {task.title}
      </Text>
      {baseQuote && (
        <Text style={typography.text}>
          将生成第 {baseQuote.revision + 1} 版；原报价保持不变。
        </Text>
      )}
      {items.map((item, index) => (
        <View key={item.id} style={styles.item}>
          <Text style={typography.text}>条目 {index + 1}</Text>
          {(
            [
              { key: "name", label: "项目名称", limit: QUOTE_LIMITS.name },
              { key: "quantity", label: "数量", limit: 3 },
              { key: "price", label: "单价（元）", limit: 10 },
              { key: "note", label: "备注", limit: QUOTE_LIMITS.note },
            ] as const
          ).map((field) => (
            <View key={field.key}>
              <Text style={typography.text}>{field.label}</Text>
              <TextInput
                autoComplete="off"
                importantForAutofill="no"
                accessibilityLabel={field.label + " " + (index + 1)}
                style={styles.input}
                value={item[field.key]}
                onChangeText={(value) => change(item.id, field.key, value)}
                editable={!mutation.pending}
                maxLength={field.limit}
                keyboardType={
                  field.key === "quantity"
                    ? "number-pad"
                    : field.key === "price"
                      ? "decimal-pad"
                      : "default"
                }
                multiline={field.key === "note"}
              />
            </View>
          ))}
          <ActionButton
            title={"删除条目 " + (index + 1)}
            secondary
            disabled={mutation.pending || items.length === 1}
            onPress={() =>
              setItems((rows) => rows.filter((row) => row.id !== item.id))
            }
          />
        </View>
      ))}
      <ActionButton
        title="添加报价条目"
        secondary
        disabled={mutation.pending || items.length >= QUOTE_LIMITS.items}
        onPress={() => setItems((rows) => [...rows, blank()])}
      />
      <Text style={typography.text}>{estimate}</Text>
      <Text style={typography.muted}>
        金额以服务端计算为准；提交后等待用户确认。结果不明时使用相同内容重试，关闭后刷新核对。修订会保留原版本。
      </Text>
    </MutationModal>
  );
}
export default function SubmitQuoteAction({
  task,
  baseQuote,
  reload,
}: {
  task: TaskTicketRecord;
  baseQuote?: QuoteRecord;
  reload: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <ActionButton
        title={baseQuote ? "修订报价" : "编制报价"}
        onPress={() => setOpen(true)}
      />
      {open && (
        <QuoteForm
          task={task}
          baseQuote={baseQuote}
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
  item: {
    gap: spacing.sm,
    padding: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
  },
  input: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    padding: spacing.sm,
    fontSize: fontSizes.input,
    minHeight: 48,
  },
});

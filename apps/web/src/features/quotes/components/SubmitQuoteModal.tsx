import { useRef } from "react";
import { Alert, Form } from "antd";
import type {
  SubmitQuoteInput,
  TaskTicketRecord,
  QuoteRecord,
} from "@device-service-hub/contracts";
import {
  calculateQuote,
  formatCents,
} from "@device-service-hub/contracts/quote-rules";
import { useSession } from "../../auth/sessionContext";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import MutationModal from "../../../shared/components/MutationModal";
import TicketActionSummary from "../../tickets/components/TicketActionSummary";
import { quotesApi } from "../api";
import {
  createEmptyQuoteItem,
  toQuoteItems,
  toQuoteFormItems,
} from "../formValues";
import QuoteItemsFields from "./QuoteItemsFields";
import type { QuoteFormItem } from "../types";
import styles from "../quotes.module.css";

export default function SubmitQuoteModal({
  task,
  baseQuote,
  onClose,
  onSubmitted,
}: {
  task: TaskTicketRecord;
  baseQuote?: QuoteRecord;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const { clearSession } = useSession();
  const [form] = Form.useForm<{ items: QuoteFormItem[] }>();
  const items = Form.useWatch("items", form) as QuoteFormItem[] | undefined;
  const intent = useRef<{ key: string; input: SubmitQuoteInput } | null>(null);
  const { submitting, error, run } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "报价结果尚未确认。相同内容可重试，关闭后请先刷新核对。",
  });
  let estimate = "填写有效条目后显示预估金额";
  try {
    if (items)
      estimate = `预估合计：¥${formatCents(calculateQuote(toQuoteItems(items)).totalCents)}`;
  } catch (error) {
    estimate = error instanceof Error ? error.message : "请检查条目";
  }
  function submit(values: { items: QuoteFormItem[] }) {
    return run((signal) => {
      const normalized = toQuoteItems(values.items);
      calculateQuote(normalized);
      const key = JSON.stringify(normalized);
      if (intent.current?.key !== key)
        intent.current = {
          key,
          input: {
            requestId: crypto.randomUUID(),
            expectedVersion: task.version,
            items: normalized,
          },
        };
      return baseQuote
        ? quotesApi.revise(
            task.id,
            {
              ...intent.current.input,
              baseQuoteId: baseQuote.id,
              baseQuoteRevision: baseQuote.revision,
            },
            signal,
          )
        : quotesApi.submit(task.id, intent.current.input, signal);
    }, onSubmitted);
  }
  return (
    <MutationModal
      title={baseQuote ? "重新报价" : "提交维修报价"}
      scrollBody
      okText="提交报价"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() => form.submit()}
    >
      <TicketActionSummary ticket={task} />
      {baseQuote && (
        <p>
          基于第 {baseQuote.revision} 版修订 · 
          将生成第 {baseQuote.revision + 1} 版 · 拒绝原因：
          {baseQuote.rejection?.reason}
        </p>
      )}
      <Form
        form={form}
        layout="vertical"
        disabled={submitting}
        onFinish={submit}
        initialValues={{
          items: baseQuote
            ? toQuoteFormItems(baseQuote.items)
            : [createEmptyQuoteItem()],
        }}
      >
        <QuoteItemsFields disabled={submitting} />
      </Form>
      <p className={styles.total}>{estimate}</p>
      <Alert
        type="info"
        showIcon
        title="以服务端计算金额为准"
        description={
          baseQuote
            ? "提交会生成新版本，原报价与拒绝记录保留。用户需重新确认新版；报价确认不代表已付款。"
            : "提交后由用户确认或拒绝。待确认及已确认报价不能直接修改；需报价任务暂不能提交维修结果。"
        }
      />
    </MutationModal>
  );
}

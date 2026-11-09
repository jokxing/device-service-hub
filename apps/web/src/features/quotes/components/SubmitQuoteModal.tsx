import { useRef } from "react";
import { Alert, Form } from "antd";
import type {
  SubmitQuoteInput,
  TaskTicketRecord,
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
import { createEmptyQuoteItem, toQuoteItems } from "../formValues";
import QuoteItemsFields from "./QuoteItemsFields";
import type { QuoteFormItem } from "../types";
import styles from "../quotes.module.css";

export default function SubmitQuoteModal({
  task,
  onClose,
  onSubmitted,
}: {
  task: TaskTicketRecord;
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
      return quotesApi.submit(task.id, intent.current.input, signal);
    }, onSubmitted);
  }
  return (
    <MutationModal
      title="提交维修报价"
      scrollBody
      okText="提交报价"
      submitting={submitting}
      error={error}
      onClose={onClose}
      onSubmit={() => form.submit()}
    >
      <TicketActionSummary ticket={task} />
      <Form
        form={form}
        layout="vertical"
        disabled={submitting}
        onFinish={submit}
        initialValues={{
          items: [createEmptyQuoteItem()],
        }}
      >
        <QuoteItemsFields disabled={submitting} />
      </Form>
      <p className={styles.total}>{estimate}</p>
      <Alert
        type="info"
        showIcon
        title="以服务端计算金额为准"
        description="提交后保留首版报价。本步尚未开放修改、用户确认及订单；需报价任务暂不能提交维修结果。"
      />
    </MutationModal>
  );
}

"use client";

import { useState } from "react";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import MutationModal from "../../../shared/components/MutationModal";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import { acceptQuote } from "../api";
import type { QuoteActionTicket, ConfirmationQuote } from "../types";

export default function AcceptQuoteModal({
  ticket,
  quote,
  onClose,
}: {
  ticket: QuoteActionTicket;
  quote: ConfirmationQuote;
  onClose: () => void;
}) {
  // Freeze both ID and versions for the whole intent, including uncertain retries.
  const [input] = useState(() => ({
    requestId: crypto.randomUUID(),
    expectedVersion: ticket.version,
    quoteId: quote.id,
    quoteRevision: quote.revision,
  }));
  const { submitting, error, run } = useApiMutation(
    "尚未确认报价结果，可重试相同操作，或关闭后刷新核对订单。",
    () => window.location.replace("/login"),
  );
  function confirm() {
    return run(
      (signal) => acceptQuote(ticket.id, input, signal),
      () =>
        window.location.replace(`/tickets/${encodeURIComponent(ticket.id)}`),
    );
  }
  return (
    <MutationModal
      title="确认维修报价"
      okText="确认报价并生成订单"
      submitting={submitting}
      error={error}
      onSubmit={confirm}
      onClose={onClose}
    >
      <p>
        <strong>
          {ticket.code} · {ticket.title}
        </strong>
      </p>
      <p>报价版本：第 {quote.revision} 版</p>
      <p>确认金额：¥{formatCents(quote.totalCents)}（人民币）</p>
      <p>
        确认后保存该版本的条目与金额快照，并生成服务订单。本操作不扣款；当前尚未接入支付、取消或改价，请核对后确认。
      </p>
    </MutationModal>
  );
}

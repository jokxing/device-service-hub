"use client";

import { useState } from "react";
import { Button } from "antd";
import type { QuoteActionTicket, ConfirmationQuote } from "../types";
import { canAcceptQuote } from "../rules";
import AcceptQuoteModal from "./AcceptQuoteModal";
import RejectQuoteModal from "./RejectQuoteModal";
import styles from "../quotes.module.css";

export default function QuoteActions({
  ticket,
  quote,
  hasOrder,
}: {
  ticket: QuoteActionTicket;
  quote: ConfirmationQuote;
  hasOrder: boolean;
}) {
  const [open, setOpen] = useState<"accept" | "reject" | null>(null);
  if (!canAcceptQuote(ticket, quote, hasOrder)) return null;
  return (
    <div className={styles.actions}>
      <Button type="primary" onClick={() => setOpen("accept")}>
        确认报价
      </Button>
      <Button onClick={() => setOpen("reject")}>拒绝报价</Button>
      {open === "accept" && (
        <AcceptQuoteModal
          ticket={ticket}
          quote={quote}
          onClose={() =>
            window.location.replace(`/tickets/${encodeURIComponent(ticket.id)}`)
          }
        />
      )}
      {open === "reject" && (
        <RejectQuoteModal
          ticket={ticket}
          quote={quote}
          onClose={() =>
            window.location.replace(`/tickets/${encodeURIComponent(ticket.id)}`)
          }
        />
      )}
    </div>
  );
}

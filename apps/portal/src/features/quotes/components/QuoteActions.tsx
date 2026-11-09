"use client";

import { useState } from "react";
import { Button } from "antd";
import type { QuoteActionTicket, ConfirmationQuote } from "../types";
import { canAcceptQuote } from "../rules";
import AcceptQuoteModal from "./AcceptQuoteModal";
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
  const [open, setOpen] = useState(false);
  if (!canAcceptQuote(ticket, quote, hasOrder)) return null;
  return (
    <div className={styles.actions}>
      <Button type="primary" onClick={() => setOpen(true)}>
        确认报价
      </Button>
      {open && (
        <AcceptQuoteModal
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

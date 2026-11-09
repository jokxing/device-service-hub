import type { ConfirmationQuote, QuoteActionTicket } from "./types";

/** Presentation only. The API independently verifies scope, version, quote and order. */
export function canAcceptQuote(
  ticket: Pick<QuoteActionTicket, "status" | "serviceMode" | "result">,
  quote: Pick<ConfirmationQuote, "status">,
  hasOrder: boolean,
): boolean {
  return (
    ticket.serviceMode === "quoted" &&
    ticket.status === "processing" &&
    !ticket.result &&
    quote.status === "pending" &&
    !hasOrder
  );
}

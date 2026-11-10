import type {
  AcceptQuoteInput,
  RejectQuoteInput,
  QuoteRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { clientPost } from "../../shared/api/http";

export function rejectQuote(
  ticketId: string,
  input: RejectQuoteInput,
  signal: AbortSignal,
) {
  return clientPost<QuoteRecord>(
    `/api/tickets/${encodeURIComponent(ticketId)}/quote/reject`,
    input,
    signal,
  );
}

export function acceptQuote(
  ticketId: string,
  input: AcceptQuoteInput,
  signal: AbortSignal,
) {
  return clientPost<ServiceOrderRecord>(
    `/api/tickets/${encodeURIComponent(ticketId)}/quote/accept`,
    input,
    signal,
  );
}

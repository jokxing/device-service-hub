import type {
  AcceptQuoteInput,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { clientPost } from "../../shared/api/http";

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

import type {
  QuoteRecord,
  SubmitQuoteInput,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";

export const quotesApi = {
  detail: (ticketId: string, signal?: AbortSignal) =>
    apiRequest<{ quote: QuoteRecord | null }>(
      `/tickets/${encodeURIComponent(ticketId)}/quote`,
      { signal, cache: "no-store" },
    ).then((result) => result.quote),
  submit: (ticketId: string, input: SubmitQuoteInput, signal?: AbortSignal) =>
    apiRequest<QuoteRecord>(`/tickets/${encodeURIComponent(ticketId)}/quote`, {
      method: "POST",
      body: JSON.stringify(input),
      signal,
    }),
};

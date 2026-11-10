import type {
  QuoteRecord,
  SubmitQuoteInput,
  ReviseQuoteInput,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";

export const quotesApi = {
  history: (ticketId: string, signal?: AbortSignal) =>
    apiRequest<{ quotes: QuoteRecord[] }>(
      `/tickets/${encodeURIComponent(ticketId)}/quote/history`,
      { signal, cache: "no-store" },
    ).then((result) => result.quotes),
  revise: (ticketId: string, input: ReviseQuoteInput, signal?: AbortSignal) =>
    apiRequest<QuoteRecord>(
      `/tickets/${encodeURIComponent(ticketId)}/quote/revisions`,
      { method: "POST", body: JSON.stringify(input), signal },
    ),
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

import type {
  QuoteRecord,
  SubmitQuoteInput,
  ReviseQuoteInput,
  AcceptQuoteInput,
  RejectQuoteInput,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import type {
  AuthenticatedRead,
  AuthenticatedPost,
} from "../../shared/api/http";
export const readTaskQuote = (
  request: AuthenticatedRead,
  id: string,
  signal?: AbortSignal,
) =>
  request<{ quote: QuoteRecord | null }>(
    `/mobile/tasks/${encodeURIComponent(id)}/quote`,
    signal,
  );
export const submitTaskQuote = (
  post: AuthenticatedPost,
  id: string,
  input: SubmitQuoteInput,
  signal?: AbortSignal,
) =>
  post<QuoteRecord>(
    `/mobile/tasks/${encodeURIComponent(id)}/quote`,
    input,
    signal,
  );

export const readMyQuote = (
  request: AuthenticatedRead,
  id: string,
  signal?: AbortSignal,
) =>
  request<{ quote: QuoteRecord | null }>(
    `/mobile/tickets/${encodeURIComponent(id)}/quote`,
    signal,
  );
export const acceptMyQuote = (
  post: AuthenticatedPost,
  id: string,
  input: AcceptQuoteInput,
  signal?: AbortSignal,
) =>
  post<ServiceOrderRecord>(
    `/mobile/tickets/${encodeURIComponent(id)}/quote/accept`,
    input,
    signal,
  );

export const rejectMyQuote = (
  post: AuthenticatedPost,
  id: string,
  input: RejectQuoteInput,
  signal?: AbortSignal,
) =>
  post<QuoteRecord>(
    `/mobile/tickets/${encodeURIComponent(id)}/quote/reject`,
    input,
    signal,
  );

export const reviseTaskQuote = (
  post: AuthenticatedPost,
  id: string,
  input: ReviseQuoteInput,
  signal?: AbortSignal,
) =>
  post<QuoteRecord>(
    `/mobile/tasks/${encodeURIComponent(id)}/quote/revisions`,
    input,
    signal,
  );

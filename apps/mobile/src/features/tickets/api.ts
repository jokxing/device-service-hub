import type {
  CreateTicketInput,
  TicketPage,
  TicketRecord,
  ReporterTicketRecord,
  ConfirmTicketInput,
} from "@device-service-hub/contracts";
import type {
  AuthenticatedRead,
  AuthenticatedPost,
} from "../../shared/api/http";
import { TICKET_PAGE_SIZE } from "./constants";
export const listMyTickets = (
  request: AuthenticatedRead,
  page: number,
  signal?: AbortSignal,
) =>
  request<TicketPage>(
    `/mobile/tickets/mine?page=${page}&pageSize=${TICKET_PAGE_SIZE}`,
    signal,
  );
export const getMyTicket = (
  request: AuthenticatedRead,
  id: string,
  signal?: AbortSignal,
) =>
  request<ReporterTicketRecord>(
    "/mobile/tickets/" + encodeURIComponent(id),
    signal,
  );
export const createTicket = (
  post: AuthenticatedPost,
  input: CreateTicketInput,
  signal?: AbortSignal,
) => post<TicketRecord>("/mobile/tickets", input, signal);

export const confirmTicket = (
  post: AuthenticatedPost,
  id: string,
  input: ConfirmTicketInput,
  signal?: AbortSignal,
) =>
  post<ReporterTicketRecord>(
    `/mobile/tickets/${encodeURIComponent(id)}/confirm`,
    input,
    signal,
  );

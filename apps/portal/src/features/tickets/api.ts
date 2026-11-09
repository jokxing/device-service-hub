import type {
  ConfirmTicketInput,
  CreateTicketInput,
  ReporterTicketRecord,
  TicketRecord,
} from "@device-service-hub/contracts";
import { clientPost } from "../../shared/api/http";

export function createTicket(input: CreateTicketInput, signal: AbortSignal) {
  return clientPost<TicketRecord>("/api/tickets", input, signal);
}

export function confirmTicket(
  ticketId: string,
  input: ConfirmTicketInput,
  signal: AbortSignal,
) {
  return clientPost<ReporterTicketRecord>(
    `/api/tickets/${encodeURIComponent(ticketId)}/confirm`,
    input,
    signal,
  );
}

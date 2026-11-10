import type {
  CreateTicketInput,
  TicketPage,
  TicketRecord,
  ReporterTicketRecord,
  ConfirmTicketInput,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";
import { ticketListQuery } from "./ticketQuery";

export const connectedTicketsApi = {
  confirm: (id: string, input: ConfirmTicketInput, signal?: AbortSignal) =>
    apiRequest<ReporterTicketRecord>(
      `/tickets/${encodeURIComponent(id)}/confirm`,
      {
        method: "POST",
        body: JSON.stringify(input),
        signal,
      },
    ),
  create: (input: CreateTicketInput, signal?: AbortSignal) =>
    apiRequest<TicketRecord>("/tickets", {
      method: "POST",
      body: JSON.stringify(input),
      signal,
    }),
  mine: (page: number, signal?: AbortSignal) =>
    apiRequest<TicketPage>(`/tickets/mine?${ticketListQuery(page)}`, {
      signal,
    }),
  detail: (id: string, signal?: AbortSignal) =>
    apiRequest<ReporterTicketRecord>(`/tickets/${encodeURIComponent(id)}`, {
      signal,
    }),
};

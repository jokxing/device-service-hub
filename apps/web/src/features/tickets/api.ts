import type {
  CreateTicketInput,
  TicketPage,
  TicketRecord,
  ReporterTicketRecord,
  ConfirmTicketInput,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";

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
    apiRequest<TicketPage>(`/tickets/mine?page=${page}&pageSize=10`, {
      signal,
    }),
  detail: (id: string, signal?: AbortSignal) =>
    apiRequest<ReporterTicketRecord>(`/tickets/${encodeURIComponent(id)}`, {
      signal,
    }),
};

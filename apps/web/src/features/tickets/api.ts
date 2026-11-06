import type {
  CreateTicketInput,
  TicketPage,
  TicketRecord,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";

export const connectedTicketsApi = {
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
    apiRequest<TicketRecord>(`/tickets/${encodeURIComponent(id)}`, { signal }),
};

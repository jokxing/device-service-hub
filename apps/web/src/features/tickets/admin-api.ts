import type {
  AdminTicketPage,
  AdminTicketRecord,
  AssignTicketInput,
  TicketPerson,
  TicketStatus,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";
import { ticketListQuery } from "./ticketQuery";

export const adminTicketsApi = {
  list: (
    page: number,
    status: TicketStatus | undefined,
    signal?: AbortSignal,
  ) => {
    const query = ticketListQuery(page, status);
    return apiRequest<AdminTicketPage>(`/admin/tickets?${query}`, { signal });
  },
  detail: (id: string, signal?: AbortSignal) =>
    apiRequest<AdminTicketRecord>(`/admin/tickets/${encodeURIComponent(id)}`, {
      signal,
    }),
  technicians: (signal?: AbortSignal) =>
    apiRequest<TicketPerson[]>("/admin/tickets/technicians", { signal }),
  assign: (id: string, input: AssignTicketInput, signal?: AbortSignal) =>
    apiRequest<AdminTicketRecord>(
      `/admin/tickets/${encodeURIComponent(id)}/assign`,
      {
        method: "POST",
        body: JSON.stringify(input),
        signal,
      },
    ),
};

import type {
  AdminTicketPage,
  AdminTicketRecord,
  AssignTicketInput,
  TicketPerson,
  TicketStatus,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";

export const adminTicketsApi = {
  list: (
    page: number,
    status: TicketStatus | undefined,
    signal?: AbortSignal,
  ) => {
    const query = new URLSearchParams({ page: String(page), pageSize: "10" });
    if (status) query.set("status", status);
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

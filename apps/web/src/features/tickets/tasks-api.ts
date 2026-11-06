import type {
  AcceptTicketInput,
  TaskTicketPage,
  TaskTicketRecord,
  TicketStatus,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";
import { ticketListQuery } from "./ticketQuery";

export const tasksApi = {
  list: (page: number, status?: TicketStatus, signal?: AbortSignal) =>
    apiRequest<TaskTicketPage>(`/tasks?${ticketListQuery(page, status)}`, {
      signal,
    }),
  detail: (id: string, signal?: AbortSignal) =>
    apiRequest<TaskTicketRecord>(`/tasks/${encodeURIComponent(id)}`, {
      signal,
    }),
  accept: (id: string, input: AcceptTicketInput, signal?: AbortSignal) =>
    apiRequest<TaskTicketRecord>(`/tasks/${encodeURIComponent(id)}/accept`, {
      method: "POST",
      body: JSON.stringify(input),
      signal,
    }),
};

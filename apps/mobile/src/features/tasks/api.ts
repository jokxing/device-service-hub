import type {
  AcceptTicketInput,
  TaskTicketPage,
  TaskTicketRecord,
  TicketStatus,
  SubmitTicketResultInput,
} from "@device-service-hub/contracts";
import type {
  AuthenticatedRead,
  AuthenticatedPost,
} from "../../shared/api/http";
import { TASK_PAGE_SIZE } from "./constants";
export const submitTaskResult = (
  post: AuthenticatedPost,
  id: string,
  input: SubmitTicketResultInput,
  signal?: AbortSignal,
) =>
  post<TaskTicketRecord>(
    `/mobile/tasks/${encodeURIComponent(id)}/result`,
    input,
    signal,
  );
export function listTasks(
  request: AuthenticatedRead,
  page: number,
  status?: TicketStatus,
  signal?: AbortSignal,
) {
  const query =
    `page=${page}&pageSize=${TASK_PAGE_SIZE}` +
    (status ? `&status=${encodeURIComponent(status)}` : "");
  return request<TaskTicketPage>("/mobile/tasks?" + query, signal);
}
export const getTask = (
  request: AuthenticatedRead,
  id: string,
  signal?: AbortSignal,
) =>
  request<TaskTicketRecord>("/mobile/tasks/" + encodeURIComponent(id), signal);
export const acceptTask = (
  post: AuthenticatedPost,
  id: string,
  input: AcceptTicketInput,
  signal?: AbortSignal,
) =>
  post<TaskTicketRecord>(
    `/mobile/tasks/${encodeURIComponent(id)}/accept`,
    input,
    signal,
  );

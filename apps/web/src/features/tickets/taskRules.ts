import type { TaskTicketRecord } from "@device-service-hub/contracts";

/** Presentation eligibility only; task ownership and transition are checked by the API. */
export function canAcceptTask(task: Pick<TaskTicketRecord, "status">): boolean {
  return task.status === "assigned";
}

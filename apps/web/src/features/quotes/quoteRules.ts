import type { TaskTicketRecord } from "@device-service-hub/contracts";

/** UI eligibility only; the API checks current ownership, version and existing quotes. */
export function canSubmitQuote(
  task: Pick<TaskTicketRecord, "serviceMode" | "status">,
): boolean {
  return task.serviceMode === "quoted" && task.status === "processing";
}

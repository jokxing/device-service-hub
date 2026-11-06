import type { TaskTicketRecord } from "@device-service-hub/contracts";
/** Display eligibility; the backend independently checks assignee and version. */
export const canAcceptTask = (
  task: Pick<TaskTicketRecord, "status" | "acceptance">,
) => task.status === "assigned" && task.acceptance === null;
export const canSubmitTaskResult = (
  task: Pick<TaskTicketRecord, "status" | "result">,
) => task.status === "processing" && task.result === null;

import type { TicketStatus } from "@device-service-hub/contracts";
export const TASK_FILTERS = [
  "assigned",
  "processing",
  "confirming",
  "completed",
  "cancelled",
] as const satisfies readonly TicketStatus[];
export const TASK_PAGE_SIZE = 10;
export const TASK_RESULT_LIMIT = 2000;

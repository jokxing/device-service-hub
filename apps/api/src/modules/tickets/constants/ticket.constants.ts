import type {
  TicketPriority,
  TicketStatus,
} from "@device-service-hub/contracts";

export const TICKET_STATUSES = [
  "pending",
  "assigned",
  "processing",
  "confirming",
  "completed",
  "cancelled",
] as const satisfies readonly TicketStatus[];

export const TICKET_LIMITS = {
  title: 60,
  description: 500,
  result: 2000,
} as const;
export const TICKET_PRIORITIES = [
  "normal",
  "urgent",
] as const satisfies readonly TicketPriority[];
export const TICKET_PAGINATION = {
  defaultSize: 10,
  maxSize: 50,
  maxPage: 100000,
} as const;

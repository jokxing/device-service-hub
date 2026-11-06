import type { TicketPriority } from "@device-service-hub/contracts";

export const TICKET_LIMITS = { title: 60, description: 500 } as const;
export const TICKET_PRIORITIES = [
  "normal",
  "urgent",
] as const satisfies readonly TicketPriority[];
export const TICKET_PAGINATION = {
  defaultSize: 10,
  maxSize: 50,
  maxPage: 100000,
} as const;

import type { Prisma } from "../../generated/prisma/client";

export const TICKET_PUBLIC_SELECT = {
  id: true,
  number: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  createdAt: true,
  assignedAt: true,
  assignee: { select: { id: true, name: true } },
  acceptance: {
    select: { actor: { select: { id: true, name: true } }, createdAt: true },
  },
  confirmation: {
    select: { actor: { select: { id: true, name: true } }, createdAt: true },
  },
  result: {
    select: {
      description: true,
      actor: { select: { id: true, name: true } },
      createdAt: true,
    },
  },
  device: { select: { id: true, code: true, name: true, location: true } },
} as const satisfies Prisma.TicketSelect;

export const ADMIN_TICKET_SELECT = {
  ...TICKET_PUBLIC_SELECT,
  version: true,
  serviceMode: true,
  reporter: { select: { id: true, name: true } },
  assignment: {
    select: {
      actor: { select: { id: true, name: true } },
      assignee: { select: { id: true, name: true } },
      createdAt: true,
    },
  },
} as const satisfies Prisma.TicketSelect;

export const TASK_TICKET_SELECT = {
  ...TICKET_PUBLIC_SELECT,
  version: true,
  serviceMode: true,
} as const satisfies Prisma.TicketSelect;

export const REPORTER_TICKET_SELECT = {
  ...TICKET_PUBLIC_SELECT,
  version: true,
  serviceMode: true,
} as const satisfies Prisma.TicketSelect;

export type ReporterTicketRow = Prisma.TicketGetPayload<{
  select: typeof REPORTER_TICKET_SELECT;
}>;

export type TaskTicketRow = Prisma.TicketGetPayload<{
  select: typeof TASK_TICKET_SELECT;
}>;

export type AdminTicketRow = Prisma.TicketGetPayload<{
  select: typeof ADMIN_TICKET_SELECT;
}>;

export type TicketRow = Prisma.TicketGetPayload<{
  select: typeof TICKET_PUBLIC_SELECT;
}>;

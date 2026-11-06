import type { Prisma } from "../../generated/prisma/client";

export const TICKET_PUBLIC_SELECT = {
  id: true,
  number: true,
  title: true,
  description: true,
  priority: true,
  status: true,
  createdAt: true,
  device: { select: { id: true, code: true, name: true, location: true } },
} as const satisfies Prisma.TicketSelect;

export type TicketRow = Prisma.TicketGetPayload<{
  select: typeof TICKET_PUBLIC_SELECT;
}>;

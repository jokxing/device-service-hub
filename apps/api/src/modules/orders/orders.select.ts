import type { Prisma } from "../../generated/prisma/client";
import { TICKET_PUBLIC_SELECT } from "../tickets/tickets.select";

export const ORDER_SELECT = {
  id: true,
  number: true,
  ticketId: true,
  quoteId: true,
  quoteRevision: true,
  status: true,
  totalCents: true,
  createdAt: true,
  confirmedBy: { select: { id: true, name: true } },
  start: {
    select: { actor: { select: { id: true, name: true } }, createdAt: true },
  },
  cancellation: {
    select: {
      reason: true,
      createdAt: true,
      actor: { select: { id: true, name: true } },
    },
  },
  items: {
    orderBy: { position: "asc" },
    select: {
      name: true,
      quantity: true,
      unitPriceCents: true,
      amountCents: true,
      note: true,
    },
  },
} as const satisfies Prisma.ServiceOrderSelect;

export const ORDER_LIST_SELECT = {
  id: true,
  number: true,
  ticketId: true,
  status: true,
  currency: true,
  totalCents: true,
  createdAt: true,
  ticket: {
    select: { number: true, title: true, device: TICKET_PUBLIC_SELECT.device },
  },
} as const satisfies Prisma.ServiceOrderSelect;

export const ORDER_DETAIL_SELECT = {
  ...ORDER_SELECT,
  ticket: { select: TICKET_PUBLIC_SELECT },
} as const satisfies Prisma.ServiceOrderSelect;

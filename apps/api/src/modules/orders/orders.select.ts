import type { Prisma } from "../../generated/prisma/client";

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

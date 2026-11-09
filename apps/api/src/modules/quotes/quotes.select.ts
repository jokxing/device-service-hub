import type { Prisma } from "../../generated/prisma/client";

export const QUOTE_SELECT = {
  id: true,
  ticketId: true,
  revision: true,
  status: true,
  totalCents: true,
  createdAt: true,
  actor: { select: { id: true, name: true } },
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
} as const satisfies Prisma.TicketQuoteSelect;

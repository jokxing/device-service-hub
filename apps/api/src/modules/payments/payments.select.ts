import type { Prisma } from "../../generated/prisma/client";
export const PAYMENT_SELECT = {
  id: true,
  number: true,
  orderId: true,
  channel: true,
  currency: true,
  amountCents: true,
  status: true,
  createdAt: true,
  closedAt: true,
  closeReason: true,
  succeededAt: true,
  expiresAt: true,
  refund: {
    select: {
      id: true,
      reason: true,
      amountCents: true,
      createdAt: true,
      completion: {
        select: {
          actor: { select: { id: true, name: true } },
          createdAt: true,
        },
      },
    },
  },
} as const satisfies Prisma.PaymentAttemptSelect;

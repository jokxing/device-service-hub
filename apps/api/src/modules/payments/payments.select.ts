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
} as const satisfies Prisma.PaymentAttemptSelect;

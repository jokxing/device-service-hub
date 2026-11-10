import type { PaymentRecord } from "@device-service-hub/contracts";
import type { Prisma } from "../../../generated/prisma/client";
import type { PAYMENT_SELECT } from "../payments.select";
export function toPaymentRecord(
  row: Prisma.PaymentAttemptGetPayload<{ select: typeof PAYMENT_SELECT }>,
): PaymentRecord {
  const {
    number,
    createdAt,
    closedAt,
    closeReason,
    succeededAt,
    expiresAt,
    ...record
  } = row;
  if (
    closeReason !== null &&
    closeReason !== "order_cancelled" &&
    closeReason !== "expired"
  )
    throw new Error("Unknown payment close reason");
  return {
    ...record,
    expiresAt: expiresAt.toISOString(),
    currency: "CNY",
    code: `MP-${String(number).padStart(6, "0")}`,
    createdAt: createdAt.toISOString(),
    closedAt: closedAt?.toISOString() ?? null,
    closeReason,
    succeededAt: succeededAt?.toISOString() ?? null,
  };
}

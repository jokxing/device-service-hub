import type { AlipaySandboxPaymentRecord } from "@device-service-hub/contracts";
import type {
  AlipaySandboxPayment,
  AlipaySandboxRefund,
} from "../../../generated/prisma/client";

export function toSandboxPayment(
  row: AlipaySandboxPayment & { refund?: AlipaySandboxRefund | null },
): AlipaySandboxPaymentRecord {
  return {
    id: row.id,
    orderId: row.orderId,
    amountCents: row.amountCents,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    expiresAt: row.expiresAt.toISOString(),
    checkedAt: row.checkedAt?.toISOString() ?? null,
    ...(row.refund !== undefined
      ? {
          refund: row.refund
            ? {
                id: row.refund.id,
                status: row.refund.status,
                reason: row.refund.reason,
                amountCents: row.refund.amountCents,
                createdAt: row.refund.createdAt.toISOString(),
                submittedAt: row.refund.submittedAt?.toISOString() ?? null,
                checkedAt: row.refund.checkedAt?.toISOString() ?? null,
                succeededAt: row.refund.succeededAt?.toISOString() ?? null,
              }
            : null,
        }
      : {}),
  };
}

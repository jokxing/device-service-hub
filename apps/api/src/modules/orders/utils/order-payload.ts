import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import type { Prisma } from "../../../generated/prisma/client";
import type { ORDER_SELECT } from "../orders.select";

export function toOrderRecord(
  row: Prisma.ServiceOrderGetPayload<{ select: typeof ORDER_SELECT }>,
): ServiceOrderRecord {
  const { number, createdAt, ...record } = row;
  return {
    ...record,
    code: `SO-${String(number).padStart(6, "0")}`,
    currency: "CNY",
    createdAt: createdAt.toISOString(),
  };
}

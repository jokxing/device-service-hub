import { createHash } from "node:crypto";
import type {
  CreateTicketInput,
  TicketRecord,
} from "@device-service-hub/contracts";
import type { TicketRow } from "../tickets.select";

/** Hash the normalized business payload, independent of JSON property order and request ID. */
export function ticketPayloadHash(input: CreateTicketInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify([
        input.deviceId,
        input.title,
        input.description,
        input.priority,
      ]),
    )
    .digest("hex");
}

export function toTicketRecord(row: TicketRow): TicketRecord {
  const { number, createdAt, ...record } = row;
  return {
    ...record,
    code: `WO-${String(number).padStart(6, "0")}`,
    createdAt: createdAt.toISOString(),
  };
}

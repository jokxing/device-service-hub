import { createHash } from "node:crypto";
import type {
  CreateTicketInput,
  TicketRecord,
  AdminTicketRecord,
} from "@device-service-hub/contracts";
import type { TicketRow, AdminTicketRow } from "../tickets.select";

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
  const { number, createdAt, assignedAt, ...record } = row;
  return {
    ...record,
    code: `WO-${String(number).padStart(6, "0")}`,
    createdAt: createdAt.toISOString(),
    assignedAt: assignedAt?.toISOString() ?? null,
  };
}

export function toAdminTicketRecord(row: AdminTicketRow): AdminTicketRecord {
  const { reporter, version, assignment, ...record } = row;
  return {
    ...toTicketRecord(record),
    reporter,
    version,
    assignment: assignment
      ? { ...assignment, createdAt: assignment.createdAt.toISOString() }
      : null,
  };
}

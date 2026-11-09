import { createHash } from "node:crypto";
import type {
  CreateTicketInput,
  TicketRecord,
  AdminTicketRecord,
  TaskTicketRecord,
  ReporterTicketRecord,
} from "@device-service-hub/contracts";
import type {
  TicketRow,
  AdminTicketRow,
  TaskTicketRow,
  ReporterTicketRow,
} from "../tickets.select";

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
  const {
    number,
    createdAt,
    assignedAt,
    acceptance,
    result,
    confirmation,
    ...record
  } = row;
  return {
    ...record,
    code: `WO-${String(number).padStart(6, "0")}`,
    createdAt: createdAt.toISOString(),
    assignedAt: assignedAt?.toISOString() ?? null,
    acceptance: acceptance
      ? { ...acceptance, createdAt: acceptance.createdAt.toISOString() }
      : null,
    result: result
      ? { ...result, createdAt: result.createdAt.toISOString() }
      : null,
    confirmation: confirmation
      ? { ...confirmation, createdAt: confirmation.createdAt.toISOString() }
      : null,
  };
}

export function toReporterTicketRecord(
  row: ReporterTicketRow,
): ReporterTicketRecord {
  const { version, ...record } = row;
  return { ...toTicketRecord(record), version };
}

export function toTaskTicketRecord(row: TaskTicketRow): TaskTicketRecord {
  const { version, serviceMode, ...record } = row;
  return { ...toTicketRecord(record), version, serviceMode };
}

export function toAdminTicketRecord(row: AdminTicketRow): AdminTicketRecord {
  const { reporter, version, serviceMode, assignment, ...record } = row;
  return {
    ...toTicketRecord(record),
    reporter,
    version,
    serviceMode,
    assignment: assignment
      ? { ...assignment, createdAt: assignment.createdAt.toISOString() }
      : null,
  };
}

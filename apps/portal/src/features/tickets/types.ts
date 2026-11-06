import type { ReporterTicketRecord } from "@device-service-hub/contracts";

export type ConfirmationTicket = Pick<
  ReporterTicketRecord,
  "id" | "code" | "title" | "version" | "status" | "result" | "confirmation"
>;

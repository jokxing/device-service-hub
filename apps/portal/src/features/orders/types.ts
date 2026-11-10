import type { ReporterTicketRecord } from "@device-service-hub/contracts";

export type CancellationTicket = Pick<
  ReporterTicketRecord,
  | "id"
  | "code"
  | "version"
  | "status"
  | "serviceMode"
  | "result"
  | "confirmation"
>;

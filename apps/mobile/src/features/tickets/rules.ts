import type { ReporterTicketRecord } from "@device-service-hub/contracts";
/** Display eligibility only; the server independently checks role and ownership. */
export function canConfirmTicket(
  ticket: Pick<ReporterTicketRecord, "status" | "result" | "confirmation">,
) {
  return (
    ticket.status === "confirming" &&
    ticket.result !== null &&
    ticket.confirmation === null
  );
}

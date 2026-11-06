import type { TicketRecord } from "@device-service-hub/contracts";

/** UI eligibility; the API independently checks role, ownership, result and version. */
export function canConfirmTicket(
  ticket: Pick<TicketRecord, "status" | "result" | "confirmation">,
): boolean {
  return (
    ticket.status === "confirming" && !!ticket.result && !ticket.confirmation
  );
}

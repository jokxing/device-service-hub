import type { ConfirmationTicket } from "./types";

/** Display eligibility only; NestJS independently enforces identity and state. */
export function canConfirmTicket(
  ticket: Pick<ConfirmationTicket, "status" | "result" | "confirmation">,
) {
  return (
    ticket.status === "confirming" &&
    ticket.result !== null &&
    ticket.confirmation === null
  );
}

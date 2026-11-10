import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import type { CancellationTicket } from "./types";

/** UI eligibility only; the API independently checks ownership and current state. */
export function canCancelOrder(
  ticket: CancellationTicket,
  order: Pick<ServiceOrderRecord, "ticketId" | "status" | "cancellation">,
) {
  return (
    ticket.id === order.ticketId &&
    ticket.serviceMode === "quoted" &&
    ticket.status === "processing" &&
    !ticket.result &&
    !ticket.confirmation &&
    order.status === "awaiting_start" &&
    !order.cancellation
  );
}

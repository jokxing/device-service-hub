import type { TicketStatus } from "@device-service-hub/contracts";
import { CONNECTED_TICKET_PAGE_SIZE } from "./constants";

export function ticketListQuery(page: number, status?: TicketStatus): string {
  const query = new URLSearchParams({
    page: String(page),
    pageSize: String(CONNECTED_TICKET_PAGE_SIZE),
  });
  if (status) query.set("status", status);
  return query.toString();
}

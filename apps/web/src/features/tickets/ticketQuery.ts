import type { TicketStatus } from "@device-service-hub/contracts";

export function ticketListQuery(page: number, status?: TicketStatus): string {
  const query = new URLSearchParams({ page: String(page), pageSize: "10" });
  if (status) query.set("status", status);
  return query.toString();
}

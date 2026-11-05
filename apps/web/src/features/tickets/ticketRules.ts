import type { Device } from "../devices/types";
import type { Actor } from "../../shared/types/session";
import type { Status, Ticket, TicketCounts, TicketFilters } from "./types";

export function canViewTicket(ticket: Ticket, actor: Actor): boolean {
  return (
    actor.role === "admin" ||
    (actor.role === "reporter"
      ? ticket.reporter === actor.name
      : ticket.assignee === actor.name)
  );
}

/** UI preview rules only. A future API must independently authorize every command. */
export function canTransition(
  ticket: Ticket,
  next: Status,
  actor: Actor,
): boolean {
  if (!canViewTicket(ticket, actor)) return false;
  switch (actor.role) {
    case "admin":
      return (
        (["pending", "assigned", "processing"].includes(ticket.status) &&
          next === "assigned") ||
        (!isTerminalStatus(ticket.status) && next === "cancelled")
      );
    case "reporter":
      return (
        (ticket.status === "pending" && next === "cancelled") ||
        (ticket.status === "confirming" &&
          ["completed", "processing"].includes(next))
      );
    case "technician":
      return (
        (ticket.status === "assigned" &&
          ["pending", "processing"].includes(next)) ||
        (ticket.status === "processing" && next === "confirming")
      );
  }
}

export function isTerminalStatus(status: Status): boolean {
  return status === "completed" || status === "cancelled";
}

export function getTicketCounts(tickets: readonly Ticket[]): TicketCounts {
  return tickets.reduce<TicketCounts>(
    (counts, ticket) => {
      if (ticket.status === "assigned" || ticket.status === "processing")
        counts.processing++;
      else if (ticket.status === "pending") counts.pending++;
      else if (ticket.status === "confirming") counts.confirming++;
      else if (ticket.status === "completed") counts.completed++;
      return counts;
    },
    { pending: 0, processing: 0, confirming: 0, completed: 0 },
  );
}

export function filterTickets(
  tickets: readonly Ticket[],
  devices: readonly Device[],
  filters: TicketFilters,
): Ticket[] {
  const deviceNames = new Map(
    devices.map((device) => [device.id, device.name]),
  );
  const query = filters.query.trim().toLocaleLowerCase();
  return tickets.filter(
    (ticket) =>
      (filters.tab === "all" ||
        (filters.tab === "active"
          ? ["assigned", "processing"].includes(ticket.status)
          : ticket.status === filters.tab)) &&
      (!filters.status || ticket.status === filters.status) &&
      (!filters.priority || ticket.priority === filters.priority) &&
      `${ticket.id} ${ticket.title} ${deviceNames.get(ticket.deviceId) ?? ""} ${ticket.deviceId}`
        .toLocaleLowerCase()
        .includes(query),
  );
}

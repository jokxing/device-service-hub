import type { Actor } from "../../shared/types/session";
import type { Ticket } from "../tickets/types";
import type { Device } from "./types";

export function canViewDevice(
  device: Device,
  actor: Actor,
  visibleTickets: readonly Ticket[],
): boolean {
  return (
    actor.role === "admin" ||
    (actor.role === "reporter"
      ? device.users.includes(actor.name)
      : visibleTickets.some((ticket) => ticket.deviceId === device.id))
  );
}

export function canReportDevice(device: Device, actor: Actor): boolean {
  return (
    actor.role === "reporter" &&
    device.enabled &&
    device.users.includes(actor.name)
  );
}

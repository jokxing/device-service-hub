import type { PublicUser } from "@device-service-hub/contracts";
import type { Prisma } from "../../../generated/prisma/client";

/** Historical reporter ownership and current technician assignment are distinct scopes. */
export function ticketReadScope(actor: PublicUser): Prisma.TicketWhereInput {
  switch (actor.role) {
    case "admin":
      return {};
    case "reporter":
      return { reporterId: actor.id };
    case "technician":
      return { assigneeId: actor.id };
    default:
      return { id: { in: [] } };
  }
}

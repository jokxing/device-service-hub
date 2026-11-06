import type { AcceptTicketInput } from "@device-service-hub/contracts";
import { TicketCommandDto } from "./ticket-command.dto";

export class AcceptTicketDto
  extends TicketCommandDto
  implements AcceptTicketInput {}

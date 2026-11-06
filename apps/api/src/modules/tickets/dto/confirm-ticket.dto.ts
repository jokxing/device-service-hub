import type { ConfirmTicketInput } from "@device-service-hub/contracts";
import { TicketCommandDto } from "./ticket-command.dto";

export class ConfirmTicketDto
  extends TicketCommandDto
  implements ConfirmTicketInput {}

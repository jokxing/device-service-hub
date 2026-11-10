import type { StartOrderInput } from "@device-service-hub/contracts";
import { TicketCommandDto } from "../../tickets/dto/ticket-command.dto";

export class StartOrderDto
  extends TicketCommandDto
  implements StartOrderInput {}

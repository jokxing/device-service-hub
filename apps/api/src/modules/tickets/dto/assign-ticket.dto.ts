import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import type { AssignTicketInput } from "@device-service-hub/contracts";
import { TicketCommandDto } from "./ticket-command.dto";

export class AssignTicketDto
  extends TicketCommandDto
  implements AssignTicketInput
{
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  assigneeId!: string;
}

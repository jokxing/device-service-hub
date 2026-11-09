import {
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
} from "class-validator";
import type {
  AssignTicketInput,
  TicketServiceMode,
} from "@device-service-hub/contracts";
import { TicketCommandDto } from "./ticket-command.dto";

export class AssignTicketDto
  extends TicketCommandDto
  implements AssignTicketInput
{
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  assigneeId!: string;

  @ValidateIf((_object, value: unknown) => value !== undefined)
  @IsIn(["direct", "quoted"])
  serviceMode?: TicketServiceMode;
}

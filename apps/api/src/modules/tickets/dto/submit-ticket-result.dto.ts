import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";
import type { SubmitTicketResultInput } from "@device-service-hub/contracts";
import { trimStringValue } from "../../../common/utils/trim-string-value";
import { TICKET_LIMITS } from "../constants/ticket.constants";
import { TicketCommandDto } from "./ticket-command.dto";

export class SubmitTicketResultDto
  extends TicketCommandDto
  implements SubmitTicketResultInput
{
  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(TICKET_LIMITS.result)
  description!: string;
}

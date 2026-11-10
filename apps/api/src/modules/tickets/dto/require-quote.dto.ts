import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";
import type { RequireQuoteInput } from "@device-service-hub/contracts";
import { QUOTE_LIMITS } from "@device-service-hub/contracts/quote-rules";
import { TicketCommandDto } from "./ticket-command.dto";
import { trimStringValue } from "../../../common/utils/trim-string-value";

export class RequireQuoteDto
  extends TicketCommandDto
  implements RequireQuoteInput
{
  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(QUOTE_LIMITS.serviceModeReason)
  reason!: string;
}

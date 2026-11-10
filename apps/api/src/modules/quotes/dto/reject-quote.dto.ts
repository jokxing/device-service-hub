import { Transform } from "class-transformer";
import {
  IsInt,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";
import type { RejectQuoteInput } from "@device-service-hub/contracts";
import { QUOTE_LIMITS } from "@device-service-hub/contracts/quote-rules";
import { TicketCommandDto } from "../../tickets/dto/ticket-command.dto";
import { trimStringValue } from "../../../common/utils/trim-string-value";

export class RejectQuoteDto
  extends TicketCommandDto
  implements RejectQuoteInput
{
  @IsUUID("4")
  quoteId!: string;

  @IsInt()
  @Min(1)
  @Max(2147483646)
  quoteRevision!: number;

  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(QUOTE_LIMITS.rejectionReason)
  reason!: string;
}

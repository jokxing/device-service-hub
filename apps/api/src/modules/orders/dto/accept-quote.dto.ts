import { IsInt, IsUUID, Max, Min } from "class-validator";
import type { AcceptQuoteInput } from "@device-service-hub/contracts";
import { TicketCommandDto } from "../../tickets/dto/ticket-command.dto";

export class AcceptQuoteDto
  extends TicketCommandDto
  implements AcceptQuoteInput
{
  @IsUUID("4")
  quoteId!: string;

  @IsInt()
  @Min(1)
  @Max(2147483646)
  quoteRevision!: number;
}

import { IsInt, IsUUID, Max, Min } from "class-validator";
import type { ReviseQuoteInput } from "@device-service-hub/contracts";
import { SubmitQuoteDto } from "./submit-quote.dto";

export class ReviseQuoteDto extends SubmitQuoteDto implements ReviseQuoteInput {
  @IsUUID("4")
  baseQuoteId!: string;

  @IsInt()
  @Min(1)
  @Max(2147483645)
  baseQuoteRevision!: number;
}

import { Transform, Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from "class-validator";
import type {
  QuoteItemInput,
  SubmitQuoteInput,
} from "@device-service-hub/contracts";
import { QUOTE_LIMITS } from "@device-service-hub/contracts/quote-rules";
import { trimStringValue } from "../../../common/utils/trim-string-value";
import { TicketCommandDto } from "../../tickets/dto/ticket-command.dto";

class QuoteItemDto implements QuoteItemInput {
  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(QUOTE_LIMITS.name)
  name!: string;

  @IsInt()
  @Min(1)
  @Max(QUOTE_LIMITS.quantity)
  quantity!: number;

  @IsInt()
  @Min(0)
  @Max(QUOTE_LIMITS.unitPriceCents)
  unitPriceCents!: number;

  @Transform(trimStringValue)
  @IsString()
  @MaxLength(QUOTE_LIMITS.note)
  note!: string;
}

export class SubmitQuoteDto
  extends TicketCommandDto
  implements SubmitQuoteInput
{
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(QUOTE_LIMITS.items)
  @ValidateNested({ each: true })
  @Type(() => QuoteItemDto)
  items!: QuoteItemDto[];
}

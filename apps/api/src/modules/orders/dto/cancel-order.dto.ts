import { Transform } from "class-transformer";
import { IsString, MaxLength, MinLength } from "class-validator";
import type { CancelOrderInput } from "@device-service-hub/contracts";
import { ORDER_LIMITS } from "@device-service-hub/contracts/order-rules";
import { TicketCommandDto } from "../../tickets/dto/ticket-command.dto";
import { trimStringValue } from "../../../common/utils/trim-string-value";

export class CancelOrderDto
  extends TicketCommandDto
  implements CancelOrderInput
{
  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(ORDER_LIMITS.cancellationReason)
  reason!: string;
}

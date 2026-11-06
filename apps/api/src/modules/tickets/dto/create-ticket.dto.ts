import { IsIn, IsString, IsUUID, MaxLength, MinLength } from "class-validator";
import { Transform } from "class-transformer";
import type {
  CreateTicketInput,
  TicketPriority,
} from "@device-service-hub/contracts";
import { trimStringValue } from "../../../common/utils/trim-string-value";
import {
  TICKET_LIMITS,
  TICKET_PRIORITIES,
} from "../constants/ticket.constants";

export class CreateTicketDto implements CreateTicketInput {
  @IsUUID("4")
  requestId!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(128)
  deviceId!: string;

  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(TICKET_LIMITS.title)
  title!: string;

  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(TICKET_LIMITS.description)
  description!: string;

  @IsIn(TICKET_PRIORITIES)
  priority!: TicketPriority;
}

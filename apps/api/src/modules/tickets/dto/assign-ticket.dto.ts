import {
  IsInt,
  IsNotEmpty,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import type { AssignTicketInput } from "@device-service-hub/contracts";

export class AssignTicketDto implements AssignTicketInput {
  @IsUUID("4")
  requestId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  assigneeId!: string;

  @IsInt()
  @Min(0)
  @Max(2147483646)
  expectedVersion!: number;
}

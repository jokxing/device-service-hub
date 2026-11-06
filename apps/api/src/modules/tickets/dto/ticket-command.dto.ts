import { IsInt, IsUUID, Max, Min } from "class-validator";
import type { TicketCommandInput } from "@device-service-hub/contracts";

export class TicketCommandDto implements TicketCommandInput {
  @IsUUID("4")
  requestId!: string;

  @IsInt()
  @Min(0)
  @Max(2147483646)
  expectedVersion!: number;
}

import { IsIn, IsOptional } from "class-validator";
import type { TicketStatus } from "@device-service-hub/contracts";
import { TicketsQueryDto } from "./tickets-query.dto";
import { TICKET_STATUSES } from "../constants/ticket.constants";

export class StatusTicketsQueryDto extends TicketsQueryDto {
  @IsOptional()
  @IsIn(TICKET_STATUSES)
  status?: TicketStatus;
}

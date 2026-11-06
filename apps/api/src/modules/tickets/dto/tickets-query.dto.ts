import { Type } from "class-transformer";
import { IsInt, Max, Min } from "class-validator";
import { TICKET_PAGINATION } from "../constants/ticket.constants";

export class TicketsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TICKET_PAGINATION.maxPage)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(TICKET_PAGINATION.maxSize)
  pageSize: number = TICKET_PAGINATION.defaultSize;
}

import { Type } from "class-transformer";
import { IsIn, IsInt, IsOptional, Max, Min } from "class-validator";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import {
  ORDER_PAGINATION,
  ORDER_STATUSES,
} from "@device-service-hub/contracts/order-rules";

export class OrdersQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ORDER_PAGINATION.maxPage)
  page = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(ORDER_PAGINATION.maxSize)
  pageSize: number = ORDER_PAGINATION.defaultSize;

  @IsOptional()
  @IsIn(ORDER_STATUSES)
  status?: ServiceOrderRecord["status"];
}

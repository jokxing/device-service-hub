import { Transform } from "class-transformer";
import { IsString, MinLength, MaxLength } from "class-validator";
import { CreateMockPaymentDto } from "./create-mock-payment.dto";
import { trimStringValue } from "../../../common/utils/trim-string-value";
export class RequestMockRefundDto extends CreateMockPaymentDto {
  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(500)
  reason!: string;
}

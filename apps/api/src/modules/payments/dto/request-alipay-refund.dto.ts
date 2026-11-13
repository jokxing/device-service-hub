import { Transform } from "class-transformer";
import { IsString, MinLength, MaxLength } from "class-validator";
import { REFUND_LIMITS } from "@device-service-hub/contracts/payment-rules";
import { CreateAlipaySandboxDto } from "./create-alipay-sandbox.dto";
import { trimStringValue } from "../../../common/utils/trim-string-value";

export class RequestAlipayRefundDto extends CreateAlipaySandboxDto {
  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(REFUND_LIMITS.reason)
  reason!: string;
}

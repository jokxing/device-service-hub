import { Transform } from "class-transformer";
import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import { trimStringValue } from "../../../common/utils/trim-string-value";
export class ResolveDeviceDto {
  @Transform(trimStringValue)
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  @Matches(/^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/)
  code!: string;
}

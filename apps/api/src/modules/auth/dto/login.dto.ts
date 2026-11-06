import { IsString, Matches, MaxLength, MinLength } from "class-validator";
import type { LoginInput } from "@device-service-hub/contracts";

export class LoginDto implements LoginInput {
  @IsString()
  @Matches(/^[a-z0-9.]+$/)
  @MaxLength(40)
  username!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password!: string;
}

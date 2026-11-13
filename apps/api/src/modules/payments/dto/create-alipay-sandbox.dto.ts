import { IsUUID } from "class-validator";
import type { CreateAlipaySandboxInput } from "@device-service-hub/contracts";
export class CreateAlipaySandboxDto implements CreateAlipaySandboxInput {
  @IsUUID("4") requestId!: string;
}

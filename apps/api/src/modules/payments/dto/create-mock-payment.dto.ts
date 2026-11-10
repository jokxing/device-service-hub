import { IsUUID } from "class-validator";
import type { CreateMockPaymentInput } from "@device-service-hub/contracts";
export class CreateMockPaymentDto implements CreateMockPaymentInput {
  @IsUUID("4") requestId!: string;
}

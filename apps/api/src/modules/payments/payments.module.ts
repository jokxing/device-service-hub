import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentLifecycleService } from "./payment-lifecycle.service";
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [PaymentsController],
  providers: [PaymentsService, PaymentLifecycleService],
  exports: [PaymentLifecycleService],
})
export class PaymentsModule {}

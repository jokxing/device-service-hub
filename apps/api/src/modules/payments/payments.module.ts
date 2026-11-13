import { NativePaymentsController } from "./native-payments.controller";
import { AlipaySandboxController } from "./alipay/alipay-sandbox.controller";
import { AlipaySandboxService } from "./alipay/alipay-sandbox.service";
import { AlipaySandboxGateway } from "./alipay/alipay-sandbox.gateway";
import { AlipaySandboxNotificationsController } from "./alipay/alipay-sandbox-notifications.controller";
import { RefundCompletionsService } from "./refund-completions.service";
import { RefundRequestsService } from "./refund-requests.service";
import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { PaymentsController } from "./payments.controller";
import { PaymentsService } from "./payments.service";
import { PaymentLifecycleService } from "./payment-lifecycle.service";
import { AlipaySandboxRefundsService } from "./alipay/alipay-sandbox-refunds.service";
import {
  AlipaySandboxRefundsController,
  AdminAlipaySandboxController,
} from "./alipay/alipay-sandbox-refunds.controller";
@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    AlipaySandboxRefundsController,
    AdminAlipaySandboxController,
    PaymentsController,
    NativePaymentsController,
    AlipaySandboxController,
    AlipaySandboxNotificationsController,
  ],
  providers: [
    AlipaySandboxRefundsService,
    AlipaySandboxService,
    AlipaySandboxGateway,
    PaymentsService,
    PaymentLifecycleService,
    RefundRequestsService,
    RefundCompletionsService,
  ],
  exports: [PaymentLifecycleService],
})
export class PaymentsModule {}

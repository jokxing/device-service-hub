import { NativeTaskOrdersController } from "./native-task-orders.controller";
import { NativeReporterOrdersController } from "./native-reporter-orders.controller";
import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderCancellationsService } from "./order-cancellations.service";
import { OrderStartsService } from "./order-starts.service";
import { OrderFulfillmentService } from "./order-fulfillment.service";
import { PaymentsModule } from "../payments/payments.module";

@Module({
  imports: [DatabaseModule, AuthModule, PaymentsModule],
  controllers: [
    OrdersController,
    NativeReporterOrdersController,
    NativeTaskOrdersController,
  ],
  providers: [
    OrdersService,
    OrderCancellationsService,
    OrderStartsService,
    OrderFulfillmentService,
  ],
  exports: [OrderFulfillmentService],
})
export class OrdersModule {}

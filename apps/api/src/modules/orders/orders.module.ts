import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { OrdersController } from "./orders.controller";
import { OrdersService } from "./orders.service";
import { OrderCancellationsService } from "./order-cancellations.service";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [OrdersController],
  providers: [OrdersService, OrderCancellationsService],
})
export class OrdersModule {}

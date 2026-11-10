import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { AdminTicketsController } from "./admin-tickets.controller";
import { AdminTicketsService } from "./admin-tickets.service";
import { TicketServiceModeService } from "./ticket-service-mode.service";
import { TaskTicketsController } from "./task-tickets.controller";
import { TaskTicketsService } from "./task-tickets.service";
import { TaskResultsService } from "./task-results.service";
import { TicketConfirmationsService } from "./ticket-confirmations.service";
import { NativeTicketsController } from "./native-tickets.controller";
import { NativeTaskTicketsController } from "./native-task-tickets.controller";
import { NativeTicketPhotosController } from "./attachments/native-ticket-photos.controller";
import { TicketPhotosService } from "./attachments/ticket-photos.service";
import { PhotoStore } from "./attachments/photo-store.service";
import { OrdersModule } from "../orders/orders.module";

@Module({
  imports: [DatabaseModule, AuthModule, OrdersModule],
  controllers: [
    NativeTicketPhotosController,
    NativeTicketsController,
    NativeTaskTicketsController,
    TicketsController,
    AdminTicketsController,
    TaskTicketsController,
  ],
  providers: [
    TicketPhotosService,
    PhotoStore,
    TicketsService,
    AdminTicketsService,
    TicketServiceModeService,
    TaskTicketsService,
    TaskResultsService,
    TicketConfirmationsService,
  ],
})
export class TicketsModule {}

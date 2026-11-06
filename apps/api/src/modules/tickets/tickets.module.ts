import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthModule } from "../auth/auth.module";
import { TicketsController } from "./tickets.controller";
import { TicketsService } from "./tickets.service";
import { AdminTicketsController } from "./admin-tickets.controller";
import { AdminTicketsService } from "./admin-tickets.service";
import { TaskTicketsController } from "./task-tickets.controller";
import { TaskTicketsService } from "./task-tickets.service";
import { TaskResultsService } from "./task-results.service";
import { TicketConfirmationsService } from "./ticket-confirmations.service";
import { NativeTicketsController } from "./native-tickets.controller";

@Module({
  imports: [DatabaseModule, AuthModule],
  controllers: [
    NativeTicketsController,
    TicketsController,
    AdminTicketsController,
    TaskTicketsController,
  ],
  providers: [
    TicketsService,
    AdminTicketsService,
    TaskTicketsService,
    TaskResultsService,
    TicketConfirmationsService,
  ],
})
export class TicketsModule {}

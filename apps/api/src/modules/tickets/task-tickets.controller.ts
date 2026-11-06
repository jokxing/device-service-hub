import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import type {
  PublicUser,
  TaskTicketPage,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionGuard } from "../auth/guards/session.guard";
import { TaskTicketsService } from "./task-tickets.service";
import { StatusTicketsQueryDto } from "./dto/status-tickets-query.dto";
import { AcceptTicketDto } from "./dto/accept-ticket.dto";
import { SubmitTicketResultDto } from "./dto/submit-ticket-result.dto";
import { TaskResultsService } from "./task-results.service";

@Controller("tasks")
@UseGuards(SessionGuard)
export class TaskTicketsController {
  constructor(
    private readonly tickets: TaskTicketsService,
    private readonly results: TaskResultsService,
  ) {}

  @Post(":id/result")
  submitResult(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: SubmitTicketResultDto,
  ): Promise<TaskTicketRecord> {
    return this.results.submit(actor, id, body);
  }

  @Get()
  list(
    @CurrentUser() actor: PublicUser,
    @Query() query: StatusTicketsQueryDto,
  ): Promise<TaskTicketPage> {
    return this.tickets.list(actor, query);
  }

  @Get(":id")
  detail(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<TaskTicketRecord> {
    return this.tickets.detail(actor, id);
  }

  @Post(":id/accept")
  accept(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: AcceptTicketDto,
  ): Promise<TaskTicketRecord> {
    return this.tickets.accept(actor, id, body);
  }
}

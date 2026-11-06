import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type {
  PublicUser,
  TicketRecord,
  TicketPage,
  ReporterTicketRecord,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { NativeClient } from "../auth/decorators/native-client.decorator";
import { NativeSessionGuard } from "../auth/guards/native-session.guard";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { TicketsQueryDto } from "./dto/tickets-query.dto";
import { TicketsService } from "./tickets.service";
import { TicketConfirmationsService } from "./ticket-confirmations.service";
import { ConfirmTicketDto } from "./dto/confirm-ticket.dto";

@Controller("mobile/tickets")
@NativeClient()
@UseGuards(NativeSessionGuard)
export class NativeTicketsController {
  constructor(
    private readonly tickets: TicketsService,
    private readonly confirmations: TicketConfirmationsService,
  ) {}
  @Post(":id/confirm")
  confirm(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: ConfirmTicketDto,
  ): Promise<ReporterTicketRecord> {
    return this.confirmations.confirm(actor, id, body);
  }
  @Post()
  async create(
    @CurrentUser() actor: PublicUser,
    @Body() body: CreateTicketDto,
    @Res({ passthrough: true }) response: Response,
  ): Promise<TicketRecord> {
    const result = await this.tickets.create(actor, body);
    response.status(result.created ? 201 : 200);
    return result.ticket;
  }
  @Get("mine")
  mine(
    @CurrentUser() actor: PublicUser,
    @Query() query: TicketsQueryDto,
  ): Promise<TicketPage> {
    return this.tickets.mine(actor, query);
  }
  @Get(":id")
  detail(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<ReporterTicketRecord> {
    return this.tickets.detail(actor, id);
  }
}

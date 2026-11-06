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
  TicketPage,
  TicketRecord,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionGuard } from "../auth/guards/session.guard";
import { CreateTicketDto } from "./dto/create-ticket.dto";
import { TicketsQueryDto } from "./dto/tickets-query.dto";
import { TicketsService } from "./tickets.service";

@Controller("tickets")
@UseGuards(SessionGuard)
export class TicketsController {
  constructor(private readonly tickets: TicketsService) {}

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
  ): Promise<TicketRecord> {
    return this.tickets.detail(actor, id);
  }
}

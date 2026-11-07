import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
  StreamableFile,
} from "@nestjs/common";
import type {
  AdminTicketPage,
  AdminTicketRecord,
  PublicUser,
  TicketPerson,
  TicketPhoto,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionGuard } from "../auth/guards/session.guard";
import { AdminTicketsService } from "./admin-tickets.service";
import { StatusTicketsQueryDto } from "./dto/status-tickets-query.dto";
import { AssignTicketDto } from "./dto/assign-ticket.dto";

@Controller("admin/tickets")
@UseGuards(SessionGuard)
export class AdminTicketsController {
  constructor(private readonly tickets: AdminTicketsService) {}

  @Get()
  list(
    @CurrentUser() actor: PublicUser,
    @Query() query: StatusTicketsQueryDto,
  ): Promise<AdminTicketPage> {
    return this.tickets.list(actor, query);
  }

  @Get("technicians")
  technicians(@CurrentUser() actor: PublicUser): Promise<TicketPerson[]> {
    return this.tickets.technicians(actor);
  }

  @Get(":id")
  detail(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<AdminTicketRecord> {
    return this.tickets.detail(actor, id);
  }

  @Get(":id/photos")
  photos(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<TicketPhoto[]> {
    return this.tickets.listPhotos(actor, id);
  }

  @Get(":id/photos/:photoId")
  async photoContent(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("photoId", new ParseUUIDPipe({ version: "4" })) photoId: string,
  ): Promise<StreamableFile> {
    return new StreamableFile(
      await this.tickets.photoContent(actor, id, photoId),
      {
        type: "image/webp",
        disposition: "inline",
      },
    );
  }

  @Post(":id/assign")
  assign(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: AssignTicketDto,
  ): Promise<AdminTicketRecord> {
    return this.tickets.assign(actor, id, input);
  }
}

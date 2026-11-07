import {
  Controller,
  Get,
  Post,
  Param,
  ParseUUIDPipe,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  StreamableFile,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import type { PublicUser, TicketPhoto } from "@device-service-hub/contracts";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { NativeClient } from "../../auth/decorators/native-client.decorator";
import { NativeSessionGuard } from "../../auth/guards/native-session.guard";
import { TicketPhotosService } from "./ticket-photos.service";
import { PHOTO_LIMITS } from "./photo.constants";

@Controller("mobile/tickets/:ticketId/photos")
@NativeClient()
@UseGuards(NativeSessionGuard)
export class NativeTicketPhotosController {
  constructor(private readonly photos: TicketPhotosService) {}
  @Get()
  list(
    @CurrentUser() actor: PublicUser,
    @Param("ticketId", new ParseUUIDPipe({ version: "4" })) ticketId: string,
  ): Promise<TicketPhoto[]> {
    return this.photos.list(actor, ticketId);
  }
  @Get(":id")
  async content(
    @CurrentUser() actor: PublicUser,
    @Param("ticketId", new ParseUUIDPipe({ version: "4" })) ticketId: string,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<StreamableFile> {
    return new StreamableFile(await this.photos.content(actor, ticketId, id), {
      type: "image/webp",
      disposition: "inline",
    });
  }
  @Post(":id")
  @UseInterceptors(
    FileInterceptor("file", {
      limits: { fileSize: PHOTO_LIMITS.bytes, files: 1, fields: 0, parts: 1 },
    }),
  )
  upload(
    @CurrentUser() actor: PublicUser,
    @Param("ticketId", new ParseUUIDPipe({ version: "4" })) ticketId: string,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @UploadedFile() file: Express.Multer.File | undefined,
  ): Promise<TicketPhoto> {
    return this.photos.upload(actor, ticketId, id, file);
  }
}

import { RejectQuoteDto } from "./dto/reject-quote.dto";
import { QuoteRejectionsService } from "./quote-rejections.service";
import {
  Controller,
  Body,
  Post,
  Get,
  Param,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import type { PublicUser, QuoteRecord } from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { NativeClient } from "../auth/decorators/native-client.decorator";
import { NativeSessionGuard } from "../auth/guards/native-session.guard";
import { QuotesService } from "./quotes.service";
@Controller("mobile/tickets/:id/quote")
@NativeClient()
@UseGuards(NativeSessionGuard)
export class NativeReporterQuotesController {
  constructor(
    private readonly quotes: QuotesService,
    private readonly rejections: QuoteRejectionsService,
  ) {}
  @Post("reject") reject(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: RejectQuoteDto,
  ): Promise<QuoteRecord> {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅报修用户可以拒绝本人报价");
    return this.rejections.reject(actor, id, input);
  }
  @Get() async detail(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ quote: QuoteRecord | null }> {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅报修用户可以查看本人报价");
    return { quote: await this.quotes.detail(actor, id) };
  }
}

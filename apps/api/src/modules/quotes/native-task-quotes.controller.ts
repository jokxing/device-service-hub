import {
  Body,
  Controller,
  Get,
  Post,
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
import { SubmitQuoteDto } from "./dto/submit-quote.dto";
import { ReviseQuoteDto } from "./dto/revise-quote.dto";
@Controller("mobile/tasks/:id/quote")
@NativeClient()
@UseGuards(NativeSessionGuard)
export class NativeTaskQuotesController {
  constructor(private readonly quotes: QuotesService) {}
  private technician(actor: PublicUser) {
    if (actor.role !== "technician")
      throw new ForbiddenException("仅当前维修人员可以访问任务报价");
  }
  @Get() async detail(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ quote: QuoteRecord | null }> {
    this.technician(actor);
    return { quote: await this.quotes.detail(actor, id) };
  }
  @Post("revisions") revise(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: ReviseQuoteDto,
  ): Promise<QuoteRecord> {
    this.technician(actor);
    return this.quotes.revise(actor, id, input);
  }
  @Post() submit(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: SubmitQuoteDto,
  ): Promise<QuoteRecord> {
    this.technician(actor);
    return this.quotes.submit(actor, id, input);
  }
}

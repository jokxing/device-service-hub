import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { PublicUser, QuoteRecord } from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionGuard } from "../auth/guards/session.guard";
import { QuotesService } from "./quotes.service";
import { SubmitQuoteDto } from "./dto/submit-quote.dto";

@Controller("tickets/:id/quote")
@UseGuards(SessionGuard)
export class QuotesController {
  constructor(private readonly quotes: QuotesService) {}

  @Get()
  async detail(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ quote: QuoteRecord | null }> {
    return { quote: await this.quotes.detail(actor, id) };
  }

  @Post()
  submit(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: SubmitQuoteDto,
  ): Promise<QuoteRecord> {
    return this.quotes.submit(actor, id, body);
  }
}

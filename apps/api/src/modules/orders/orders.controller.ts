import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import type {
  PublicUser,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionGuard } from "../auth/guards/session.guard";
import { OrdersService } from "./orders.service";
import { AcceptQuoteDto } from "./dto/accept-quote.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { OrderCancellationsService } from "./order-cancellations.service";

@Controller()
@UseGuards(SessionGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly cancellations: OrderCancellationsService,
  ) {}

  @Post("orders/:id/cancel")
  cancel(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: CancelOrderDto,
  ): Promise<ServiceOrderRecord> {
    return this.cancellations.cancel(actor, id, body);
  }

  @Get("orders/by-ticket/:id")
  async byTicket(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ order: ServiceOrderRecord | null }> {
    return { order: await this.orders.byTicket(actor, id) };
  }

  @Post("tickets/:id/quote/accept")
  acceptQuote(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: AcceptQuoteDto,
  ): Promise<ServiceOrderRecord> {
    return this.orders.acceptQuote(actor, id, body);
  }
}

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
  ServiceOrderRecord,
  ServiceOrderPage,
  ServiceOrderDetail,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionGuard } from "../auth/guards/session.guard";
import { OrdersService } from "./orders.service";
import { AcceptQuoteDto } from "./dto/accept-quote.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { OrderCancellationsService } from "./order-cancellations.service";
import { OrderStartsService } from "./order-starts.service";
import { StartOrderDto } from "./dto/start-order.dto";
import { OrdersQueryDto } from "./dto/orders-query.dto";

@Controller()
@UseGuards(SessionGuard)
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly cancellations: OrderCancellationsService,
    private readonly starts: OrderStartsService,
  ) {}

  @Get("orders")
  list(
    @CurrentUser() actor: PublicUser,
    @Query() query: OrdersQueryDto,
  ): Promise<ServiceOrderPage> {
    return this.orders.list(actor, query);
  }

  @Post("orders/:id/start")
  start(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: StartOrderDto,
  ): Promise<ServiceOrderRecord> {
    return this.starts.start(actor, id, body);
  }

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

  @Get("orders/:id")
  detail(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<ServiceOrderDetail> {
    return this.orders.detail(actor, id);
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

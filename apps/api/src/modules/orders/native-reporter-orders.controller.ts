import {
  Controller,
  Query,
  Get,
  Post,
  Body,
  Param,
  ParseUUIDPipe,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import type {
  PublicUser,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { NativeClient } from "../auth/decorators/native-client.decorator";
import { NativeSessionGuard } from "../auth/guards/native-session.guard";
import { OrdersService } from "./orders.service";
import { AcceptQuoteDto } from "./dto/accept-quote.dto";
import { OrdersQueryDto } from "./dto/orders-query.dto";
import { CancelOrderDto } from "./dto/cancel-order.dto";
import { OrderCancellationsService } from "./order-cancellations.service";
@Controller("mobile")
@NativeClient()
@UseGuards(NativeSessionGuard)
export class NativeReporterOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly cancellations: OrderCancellationsService,
  ) {}
  private reporter(actor: PublicUser) {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅报修用户可以操作本人报价订单");
  }
  @Post("orders/:id/cancel") cancel(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: CancelOrderDto,
  ): Promise<ServiceOrderRecord> {
    this.reporter(actor);
    return this.cancellations.cancel(actor, id, input);
  }
  @Get("orders/by-ticket/:id") async byTicket(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ order: ServiceOrderRecord | null }> {
    this.reporter(actor);
    return { order: await this.orders.byTicket(actor, id) };
  }
  @Get("orders") list(
    @CurrentUser() actor: PublicUser,
    @Query() query: OrdersQueryDto,
  ) {
    this.reporter(actor);
    return this.orders.list(actor, query);
  }
  @Get("orders/:id") detail(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    this.reporter(actor);
    return this.orders.detail(actor, id);
  }
  @Post("tickets/:id/quote/accept") accept(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: AcceptQuoteDto,
  ): Promise<ServiceOrderRecord> {
    this.reporter(actor);
    return this.orders.acceptQuote(actor, id, input);
  }
}

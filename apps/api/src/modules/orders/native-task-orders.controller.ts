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
import type {
  PublicUser,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { NativeClient } from "../auth/decorators/native-client.decorator";
import { NativeSessionGuard } from "../auth/guards/native-session.guard";
import { OrdersService } from "./orders.service";
import { OrderStartsService } from "./order-starts.service";
import { StartOrderDto } from "./dto/start-order.dto";
@Controller("mobile")
@NativeClient()
@UseGuards(NativeSessionGuard)
export class NativeTaskOrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly starts: OrderStartsService,
  ) {}
  private technician(actor: PublicUser) {
    if (actor.role !== "technician")
      throw new ForbiddenException("仅当前维修员可以操作任务订单");
  }
  @Get("tasks/:id/order") async byTicket(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ order: ServiceOrderRecord | null }> {
    this.technician(actor);
    return { order: await this.orders.byTicket(actor, id) };
  }
  @Post("orders/:id/start") start(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: StartOrderDto,
  ): Promise<ServiceOrderRecord> {
    this.technician(actor);
    return this.starts.start(actor, id, input);
  }
}

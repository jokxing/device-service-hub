import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { PublicUser } from "@device-service-hub/contracts";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { SessionGuard } from "../../auth/guards/session.guard";
import { RequestAlipayRefundDto } from "../dto/request-alipay-refund.dto";
import { AlipaySandboxRefundsService } from "./alipay-sandbox-refunds.service";

@Controller("orders/:id/alipay-sandbox/:paymentId/refund")
@UseGuards(SessionGuard)
export class AlipaySandboxRefundsController {
  constructor(private readonly service: AlipaySandboxRefundsService) {}
  @Post() request(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
    @Body() input: RequestAlipayRefundDto,
  ) {
    return this.service.request(actor, id, paymentId, input);
  }
  @Post("submit") submit(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ) {
    return this.service.submit(actor, id, paymentId);
  }
  @Post("query") query(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ) {
    return this.service.query(actor, id, paymentId);
  }
}
@Controller("admin/orders/:id/alipay-sandbox")
@UseGuards(SessionGuard)
export class AdminAlipaySandboxController {
  constructor(private readonly service: AlipaySandboxRefundsService) {}
  @Get() list(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.service.listAdmin(actor, id);
  }
}

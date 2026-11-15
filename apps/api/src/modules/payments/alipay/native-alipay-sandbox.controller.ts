import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
  ForbiddenException,
} from "@nestjs/common";
import type { PublicUser } from "@device-service-hub/contracts";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { NativeClient } from "../../auth/decorators/native-client.decorator";
import { NativeSessionGuard } from "../../auth/guards/native-session.guard";
import { CreateAlipaySandboxDto } from "../dto/create-alipay-sandbox.dto";
import { AlipaySandboxService } from "./alipay-sandbox.service";
import { AlipaySandboxRefundsService } from "./alipay-sandbox-refunds.service";
import { RequestAlipayRefundDto } from "../dto/request-alipay-refund.dto";

@Controller("mobile/orders/:id/alipay-sandbox")
@NativeClient()
@UseGuards(NativeSessionGuard)
export class NativeAlipaySandboxController {
  constructor(
    private readonly service: AlipaySandboxService,
    private readonly refunds: AlipaySandboxRefundsService,
  ) {}
  private reporter(actor: PublicUser) {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅报修用户可访问本人退款");
  }
  @Post(":paymentId/refund") requestRefund(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
    @Body() input: RequestAlipayRefundDto,
  ) {
    this.reporter(actor);
    return this.refunds.request(actor, id, paymentId, input);
  }
  @Post(":paymentId/refund/query") queryRefund(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ) {
    this.reporter(actor);
    return this.refunds.query(actor, id, paymentId);
  }
  @Get() list(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ) {
    return this.service.list(actor, id);
  }
  @Post() create(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: CreateAlipaySandboxDto,
  ) {
    return this.service.createApp(actor, id, input);
  }
  @Post(":paymentId/checkout") checkout(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ) {
    return this.service.checkoutApp(actor, id, paymentId);
  }
  @Post(":paymentId/query") query(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ) {
    return this.service.query(actor, id, paymentId);
  }
  @Post(":paymentId/close") close(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ) {
    return this.service.close(actor, id, paymentId);
  }
}

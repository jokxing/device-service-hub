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
import type { PublicUser, PaymentRecord } from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { NativeClient } from "../auth/decorators/native-client.decorator";
import { NativeSessionGuard } from "../auth/guards/native-session.guard";
import { PaymentsService } from "./payments.service";
import { CreateMockPaymentDto } from "./dto/create-mock-payment.dto";
import { RefundRequestsService } from "./refund-requests.service";
import { RequestMockRefundDto } from "./dto/request-mock-refund.dto";
@Controller("mobile/orders/:id/payments")
@NativeClient()
@UseGuards(NativeSessionGuard)
export class NativePaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly refunds: RefundRequestsService,
  ) {}
  private reporter(actor: PublicUser) {
    if (actor.role !== "reporter")
      throw new ForbiddenException("仅报修用户可以访问本人模拟支付");
  }
  @Post(":paymentId/refund") requestRefund(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
    @Body() input: RequestMockRefundDto,
  ): Promise<PaymentRecord> {
    this.reporter(actor);
    return this.refunds.request(actor, id, paymentId, input);
  }
  @Get() async list(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ payments: PaymentRecord[] }> {
    this.reporter(actor);
    return { payments: await this.payments.byOrder(actor, id) };
  }
  @Post() create(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: CreateMockPaymentDto,
  ): Promise<PaymentRecord> {
    this.reporter(actor);
    return this.payments.createMock(actor, id, input);
  }
  @Post(":paymentId/mock-success") confirm(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ): Promise<PaymentRecord> {
    this.reporter(actor);
    return this.payments.confirmMock(actor, id, paymentId);
  }
}

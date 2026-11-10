import { RefundCompletionsService } from "./refund-completions.service";
import { RefundRequestsService } from "./refund-requests.service";
import { RequestMockRefundDto } from "./dto/request-mock-refund.dto";
import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from "@nestjs/common";
import type { PublicUser, PaymentRecord } from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { SessionGuard } from "../auth/guards/session.guard";
import { PaymentsService } from "./payments.service";
import { CreateMockPaymentDto } from "./dto/create-mock-payment.dto";
@Controller("orders/:id/payments")
@UseGuards(SessionGuard)
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly refunds: RefundRequestsService,
    private readonly completions: RefundCompletionsService,
  ) {}
  @Post(":paymentId/refund/mock-success")
  completeRefund(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
    @Body() input: CreateMockPaymentDto,
  ): Promise<PaymentRecord> {
    return this.completions.complete(actor, id, paymentId, input);
  }
  @Post(":paymentId/refund")
  requestRefund(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
    @Body() input: RequestMockRefundDto,
  ): Promise<PaymentRecord> {
    return this.refunds.request(actor, id, paymentId, input);
  }
  @Post(":paymentId/mock-success")
  confirmMock(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ): Promise<PaymentRecord> {
    return this.payments.confirmMock(actor, id, paymentId);
  }
  @Get()
  async list(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ payments: PaymentRecord[] }> {
    return { payments: await this.payments.byOrder(actor, id) };
  }
  @Post()
  create(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() body: CreateMockPaymentDto,
  ): Promise<PaymentRecord> {
    return this.payments.createMock(actor, id, body);
  }
}

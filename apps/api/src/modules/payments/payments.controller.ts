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
  constructor(private readonly payments: PaymentsService) {}
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

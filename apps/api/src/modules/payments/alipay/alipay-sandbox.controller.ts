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
  AlipaySandboxPaymentRecord,
  AlipaySandboxCheckout,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { SessionGuard } from "../../auth/guards/session.guard";
import { AlipaySandboxService } from "./alipay-sandbox.service";
import { CreateAlipaySandboxDto } from "../dto/create-alipay-sandbox.dto";
@Controller("orders/:id/alipay-sandbox")
@UseGuards(SessionGuard)
export class AlipaySandboxController {
  constructor(private readonly service: AlipaySandboxService) {}
  @Get() list(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
  ): Promise<{ enabled: boolean; payments: AlipaySandboxPaymentRecord[] }> {
    return this.service.list(actor, id);
  }
  @Post() create(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Body() input: CreateAlipaySandboxDto,
  ): Promise<AlipaySandboxCheckout> {
    return this.service.create(actor, id, input);
  }
  @Post(":paymentId/checkout") checkout(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ): Promise<AlipaySandboxCheckout> {
    return this.service.checkout(actor, id, paymentId);
  }
  @Post(":paymentId/query") query(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ): Promise<AlipaySandboxPaymentRecord> {
    return this.service.query(actor, id, paymentId);
  }
  @Post(":paymentId/close") close(
    @CurrentUser() actor: PublicUser,
    @Param("id", new ParseUUIDPipe({ version: "4" })) id: string,
    @Param("paymentId", new ParseUUIDPipe({ version: "4" })) paymentId: string,
  ): Promise<AlipaySandboxPaymentRecord> {
    return this.service.close(actor, id, paymentId);
  }
}

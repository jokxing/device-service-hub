import {
  Controller,
  Header,
  HttpCode,
  Post,
  Req,
  UnsupportedMediaTypeException,
} from "@nestjs/common";
import type { Request } from "express";
import { ChannelNotification } from "../../auth/decorators/channel-notification.decorator";
import { AlipaySandboxService } from "./alipay-sandbox.service";

@Controller("payments/alipay-sandbox")
export class AlipaySandboxNotificationsController {
  constructor(private readonly service: AlipaySandboxService) {}

  @Post("notify")
  @ChannelNotification()
  @HttpCode(200)
  @Header("Content-Type", "text/plain; charset=utf-8")
  async notify(@Req() request: Request): Promise<string> {
    if (!request.is("application/x-www-form-urlencoded"))
      throw new UnsupportedMediaTypeException("渠道通知必须使用表单编码");
    await this.service.notify(request.body as unknown);
    // Only acknowledge after verification and the transaction have committed.
    return "success";
  }
}

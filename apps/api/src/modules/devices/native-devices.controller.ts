import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import type { DeviceSummary, PublicUser } from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { NativeClient } from "../auth/decorators/native-client.decorator";
import { NativeSessionGuard } from "../auth/guards/native-session.guard";
import { DevicesService } from "./devices.service";

@Controller("mobile/devices")
@NativeClient()
@UseGuards(NativeSessionGuard)
export class NativeDevicesController {
  constructor(private readonly devices: DevicesService) {}
  @Get()
  list(@CurrentUser() actor: PublicUser): Promise<DeviceSummary[]> {
    return this.devices.list(actor);
  }
  @Get(":id")
  detail(
    @Param("id") id: string,
    @CurrentUser() actor: PublicUser,
  ): Promise<DeviceSummary> {
    return this.devices.detail(id, actor);
  }
}

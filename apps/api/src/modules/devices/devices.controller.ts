import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { DevicesService } from "./devices.service";
import { SessionGuard } from "../auth/guards/session.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { DeviceSummary, PublicUser } from "@device-service-hub/contracts";

@Controller("devices")
@UseGuards(SessionGuard)
export class DevicesController {
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

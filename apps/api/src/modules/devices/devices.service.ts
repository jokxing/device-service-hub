import { Injectable, NotFoundException } from "@nestjs/common";
import { DatabaseService } from "../../database/database.service";
import type { PublicUser } from "@device-service-hub/contracts";
import type { Prisma } from "../../generated/prisma/client";
import type { DeviceSummary } from "@device-service-hub/contracts";
import { DEVICE_PUBLIC_SELECT } from "./devices.select";

@Injectable()
export class DevicesService {
  constructor(private readonly database: DatabaseService) {}

  private scope(actor: PublicUser): Prisma.DeviceWhereInput {
    if (actor.role === "admin") return {};
    if (actor.role === "reporter")
      return { access: { some: { userId: actor.id } } };
    // Technician access will come from assigned tickets, which are outside this step.
    return { id: { in: [] } };
  }

  list(actor: PublicUser): Promise<DeviceSummary[]> {
    return this.database.device.findMany({
      where: this.scope(actor),
      orderBy: { code: "asc" },
      select: DEVICE_PUBLIC_SELECT,
    });
  }

  async detail(id: string, actor: PublicUser): Promise<DeviceSummary> {
    const device = await this.database.device.findFirst({
      where: { AND: [{ id }, this.scope(actor)] },
      select: DEVICE_PUBLIC_SELECT,
    });
    if (!device) throw new NotFoundException("设备不存在或无权访问");
    return device;
  }
}

import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../../database/database.module";
import { DevicesController } from "./devices.controller";
import { DevicesService } from "./devices.service";
import { NativeDevicesController } from "./native-devices.controller";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [DevicesController, NativeDevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}

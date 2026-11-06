import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { DatabaseModule } from "../../database/database.module";
import { DevicesController } from "./devices.controller";
import { DevicesService } from "./devices.service";

@Module({
  imports: [AuthModule, DatabaseModule],
  controllers: [DevicesController],
  providers: [DevicesService],
})
export class DevicesModule {}

import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { SessionGuard } from "./guards/session.guard";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [AuthService, SessionGuard],
  exports: [SessionGuard, AuthService],
})
export class AuthModule {}

import { Module } from "@nestjs/common";
import { DatabaseModule } from "../../database/database.module";
import { AuthService } from "./auth.service";
import { AuthController } from "./auth.controller";
import { SessionGuard } from "./guards/session.guard";
import { NativeSessionGuard } from "./guards/native-session.guard";
import { NativeAuthController } from "./native-auth.controller";

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController, NativeAuthController],
  providers: [AuthService, SessionGuard, NativeSessionGuard],
  exports: [SessionGuard, NativeSessionGuard, AuthService],
})
export class AuthModule {}

import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import type {
  NativeLoginResponse,
  PublicUser,
  SessionResponse,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request.type";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { NativeClient } from "./decorators/native-client.decorator";
import { NativeSessionGuard } from "./guards/native-session.guard";
import { readNativeToken } from "./utils/native-token";

@Controller("mobile/auth")
@NativeClient()
export class NativeAuthController {
  constructor(private readonly auth: AuthService) {}
  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() request: AuthenticatedRequest,
  ): Promise<NativeLoginResponse> {
    const session = await this.auth.login(
      body.username,
      body.password,
      readNativeToken(request, false),
    );
    return {
      user: session.actor,
      expiresAt: session.expiresAt.toISOString(),
      accessToken: session.token,
    };
  }
  @Get("me")
  @UseGuards(NativeSessionGuard)
  me(@CurrentUser() user: PublicUser): SessionResponse {
    return { user };
  }
  @Post("logout")
  @HttpCode(204)
  async logout(@Req() request: AuthenticatedRequest): Promise<void> {
    await this.auth.logout(readNativeToken(request));
  }
}

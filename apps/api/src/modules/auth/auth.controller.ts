import {
  Body,
  Controller,
  Get,
  HttpCode,
  Post,
  Req,
  Res,
  UseGuards,
} from "@nestjs/common";
import type { Response } from "express";
import type {
  LoginResponse,
  PublicUser,
  SessionResponse,
} from "@device-service-hub/contracts";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import type { AuthenticatedRequest } from "../../common/types/authenticated-request.type";
import { AuthService } from "./auth.service";
import { LoginDto } from "./dto/login.dto";
import { SessionGuard } from "./guards/session.guard";
import {
  SESSION_COOKIE,
  SESSION_DURATION_MS,
} from "./constants/session.constants";
import { readSessionToken } from "./utils/session-token";
import { sessionCookieOptions } from "./utils/session-cookie";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("login")
  @HttpCode(200)
  async login(
    @Body() body: LoginDto,
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<LoginResponse> {
    const session = await this.auth.login(
      body.username,
      body.password,
      readSessionToken(request),
    );
    response.cookie(SESSION_COOKIE, session.token, {
      ...sessionCookieOptions(),
      maxAge: SESSION_DURATION_MS,
    });
    return { user: session.actor, expiresAt: session.expiresAt.toISOString() };
  }

  @Get("me")
  @UseGuards(SessionGuard)
  me(@CurrentUser() actor: PublicUser): SessionResponse {
    return { user: actor };
  }

  @Post("logout")
  @HttpCode(204)
  async logout(
    @Req() request: AuthenticatedRequest,
    @Res({ passthrough: true }) response: Response,
  ): Promise<void> {
    await this.auth.logout(readSessionToken(request));
    response.clearCookie(SESSION_COOKIE, sessionCookieOptions());
  }
}

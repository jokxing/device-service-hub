import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { getConfig } from "../../../config/env.config";
import { Reflector } from "@nestjs/core";
import { NATIVE_CLIENT } from "../decorators/native-client.decorator";
import { CHANNEL_NOTIFICATION } from "../decorators/channel-notification.decorator";

/** Cookies use SameSite=Strict; mutations also require an explicitly allowed Origin. */
@Injectable()
export class OriginGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (
      this.reflector.getAllAndOverride<boolean>(CHANNEL_NOTIFICATION, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      if (
        request.headers.origin !== undefined ||
        request.headers.cookie !== undefined ||
        request.headers.authorization !== undefined ||
        Object.keys(request.headers).some((key) => key.startsWith("sec-fetch-"))
      )
        throw new ForbiddenException("渠道通知不接受浏览器来源或用户凭据");
      return true;
    }
    if (
      this.reflector.getAllAndOverride<boolean>(NATIVE_CLIENT, [
        context.getHandler(),
        context.getClass(),
      ])
    ) {
      if (
        request.headers.origin !== undefined ||
        request.headers.cookie !== undefined ||
        Object.keys(request.headers).some((key) => key.startsWith("sec-fetch-"))
      )
        throw new ForbiddenException("原生接口不接受浏览器来源或 Cookie");
      return true;
    }
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
    const origin = request.get("origin");
    if (!origin || !getConfig().webOrigins.includes(origin))
      throw new ForbiddenException("请求来源不被允许");
    return true;
  }
}

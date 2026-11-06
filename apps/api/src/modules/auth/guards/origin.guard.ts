import { ForbiddenException, Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import type { Request } from "express";
import { getConfig } from "../../../config/env.config";

/** Cookies use SameSite=Strict; mutations also require an explicitly allowed Origin. */
@Injectable()
export class OriginGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return true;
    const origin = request.get("origin");
    if (!origin || !getConfig().webOrigins.includes(origin))
      throw new ForbiddenException("请求来源不被允许");
    return true;
  }
}

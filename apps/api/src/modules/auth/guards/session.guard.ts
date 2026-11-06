import { Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { readSessionToken } from "../utils/session-token";
import type { AuthenticatedRequest } from "../../../common/types/authenticated-request.type";

@Injectable()
export class SessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.actor = await this.auth.authenticate(readSessionToken(request));
    return true;
  }
}

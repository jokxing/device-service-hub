import { Injectable } from "@nestjs/common";
import type { CanActivate, ExecutionContext } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { readNativeToken } from "../utils/native-token";
import type { AuthenticatedRequest } from "../../../common/types/authenticated-request.type";

@Injectable()
export class NativeSessionGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    request.actor = await this.auth.authenticate(readNativeToken(request));
    return true;
  }
}

import { createParamDecorator, UnauthorizedException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { PublicUser } from "@device-service-hub/contracts";
import type { AuthenticatedRequest } from "../types/authenticated-request.type";

/** Reads the server-authenticated actor; does not replace SessionGuard. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PublicUser => {
    const actor = context
      .switchToHttp()
      .getRequest<AuthenticatedRequest>().actor;
    if (!actor) throw new UnauthorizedException();
    return actor;
  },
);

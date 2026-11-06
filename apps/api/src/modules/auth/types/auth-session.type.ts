import type { PublicUser } from "@device-service-hub/contracts";

/** Internal service result; raw token is used only to issue the HttpOnly cookie. */
export interface CreatedSession {
  token: string;
  actor: PublicUser;
  expiresAt: Date;
}

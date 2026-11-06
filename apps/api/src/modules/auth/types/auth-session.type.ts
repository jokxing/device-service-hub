import type { PublicUser } from "@device-service-hub/contracts";

/** Internal result; transport controllers issue a Web cookie or native credential. Never log. */
export interface CreatedSession {
  token: string;
  actor: PublicUser;
  expiresAt: Date;
}

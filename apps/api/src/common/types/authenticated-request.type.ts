import type { Request } from "express";
import type { PublicUser } from "@device-service-hub/contracts";

/** actor is populated only after successful session authentication. */
export interface AuthenticatedRequest extends Request {
  actor?: PublicUser;
}

import type { Role } from "@device-service-hub/contracts";
export type { Role } from "@device-service-hub/contracts";

export interface Actor {
  role: Role;
  name: string;
}

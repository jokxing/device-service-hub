import type { Role } from "@device-service-hub/contracts";

/** Display labels only; data authorization remains on the server. */
export const ROLE_LABELS = {
  reporter: "报修用户",
  admin: "管理员",
  technician: "维修人员",
} as const satisfies Record<Role, string>;

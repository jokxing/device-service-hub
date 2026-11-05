import type { Role } from "../types/session";

export const ROLE_LABELS: Record<Role, string> = {
  admin: "管理员",
  reporter: "报修用户",
  technician: "维修人员",
};

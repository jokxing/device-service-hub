import type { Actor, Role } from "../shared/types/session";
import { ROLE_LABELS } from "../shared/constants/roles";

export const DEMO_ACCOUNTS: Record<Role, Actor> = {
  admin: { role: "admin", name: "陈管理员" },
  reporter: { role: "reporter", name: "张明" },
  technician: { role: "technician", name: "王志远" },
};
export const DEMO_TECHNICIANS = ["王志远", "李建国", "赵晨"];
export const DEMO_ROLE_OPTIONS = (Object.keys(ROLE_LABELS) as Role[]).map(
  (value) => ({ value, label: `演示：${ROLE_LABELS[value]}` }),
);

import type { Prisma } from "../../generated/prisma/client";

export const PUBLIC_USER_SELECT = {
  id: true,
  username: true,
  name: true,
  role: true,
} as const satisfies Prisma.UserSelect;

import type { Prisma } from "../../generated/prisma/client";

/** Public response fields only; access grants and user relations are excluded. */
export const DEVICE_PUBLIC_SELECT = {
  id: true,
  code: true,
  name: true,
  category: true,
  location: true,
  model: true,
  enabled: true,
} as const satisfies Prisma.DeviceSelect;

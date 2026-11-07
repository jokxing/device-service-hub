export const PHOTO_LIMITS = {
  count: 3,
  bytes: 5 * 1024 * 1024,
  pixels: 24_000_000,
  edge: 1600,
} as const;
export const PHOTO_PUBLIC_SELECT = {
  id: true,
  width: true,
  height: true,
  bytes: true,
  createdAt: true,
} as const;

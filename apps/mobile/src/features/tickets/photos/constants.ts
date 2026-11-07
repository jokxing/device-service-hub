export const PHOTO_LIMITS = {
  count: 3,
  bytes: 5 * 1024 * 1024,
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
} as const;

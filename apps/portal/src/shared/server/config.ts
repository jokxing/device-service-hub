import "server-only";

export const PORTAL_COOKIE = "dsh_portal_session";
export const API_COOKIE = "dsh_session";
export const API_BASE_URL =
  process.env.API_BASE_URL ?? "http://127.0.0.1:3001/api";
export const PORTAL_ORIGIN =
  process.env.PORTAL_ORIGIN ?? "http://127.0.0.1:3000";
export const privateHeaders = { "Cache-Control": "private, no-store" };

export function cookieOptions() {
  return {
    httpOnly: true,
    secure: new URL(PORTAL_ORIGIN).protocol === "https:",
    sameSite: "strict" as const,
    path: "/",
  };
}

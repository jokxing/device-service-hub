import type { CookieOptions } from "express";
import { getConfig } from "../../../config/env.config";
import { SESSION_COOKIE_PATH } from "../constants/session.constants";

/** Creation and clearing must use the same path and security options. */
export function sessionCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "strict",
    secure: getConfig().secureCookies,
    path: SESSION_COOKIE_PATH,
  };
}

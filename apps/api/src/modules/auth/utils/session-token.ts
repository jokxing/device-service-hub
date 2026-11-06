import { createHash } from "node:crypto";
import type { Request } from "express";
import { SESSION_COOKIE } from "../constants/session.constants";

export function readSessionToken(request: Request): string | undefined {
  const cookies = request.cookies as Record<string, unknown> | undefined;
  const token = cookies?.[SESSION_COOKIE];
  return typeof token === "string" && /^[a-f0-9]{64}$/.test(token)
    ? token
    : undefined;
}

export function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

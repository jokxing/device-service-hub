import { UnauthorizedException } from "@nestjs/common";
import type { Request } from "express";

export function readNativeToken(
  request: Request,
  required = true,
): string | undefined {
  const authorization = request.get("authorization");
  if (!authorization && !required) return undefined;
  const token = authorization?.match(/^Bearer ([a-f0-9]{64})$/)?.[1];
  if (!token) throw new UnauthorizedException("请使用有效的原生会话");
  return token;
}

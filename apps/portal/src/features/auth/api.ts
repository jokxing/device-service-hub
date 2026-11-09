import type { LoginInput, LoginResponse } from "@device-service-hub/contracts";
import { clientPost } from "../../shared/api/http";

export function loginAccount(input: LoginInput, signal: AbortSignal) {
  return clientPost<Pick<LoginResponse, "user">>(
    "/api/auth/login",
    input,
    signal,
  );
}

export function logoutAccount(signal: AbortSignal) {
  return clientPost<void>("/api/auth/logout", undefined, signal);
}

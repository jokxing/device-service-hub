import type {
  NativeLoginResponse,
  SessionResponse,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";

export function loginNative(username: string, password: string) {
  return apiRequest<NativeLoginResponse>("/mobile/auth/login", {
    method: "POST",
    body: { username: username.trim(), password },
  });
}

export function getNativeSession(token: string) {
  return apiRequest<SessionResponse>("/mobile/auth/me", { token });
}

export function logoutNative(token: string) {
  return apiRequest<void>("/mobile/auth/logout", { method: "POST", token });
}

import type {
  LoginInput,
  LoginResponse,
  SessionResponse,
} from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";

export const authApi = {
  me: (signal?: AbortSignal) =>
    apiRequest<SessionResponse>("/auth/me", { signal }),
  login: (input: LoginInput) =>
    apiRequest<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    }),
  logout: () => apiRequest<void>("/auth/logout", { method: "POST" }),
};

import type { SessionResponse } from "@device-service-hub/contracts";
import { apiGet } from "../../shared/api/http";
export const sessionApi = {
  me: (signal: AbortSignal) => apiGet<SessionResponse>("/auth/me", signal),
};

import type { DeviceSummary } from "@device-service-hub/contracts";
import { apiGet } from "../../shared/api/http";
export const devicesApi = {
  list: (signal: AbortSignal) => apiGet<DeviceSummary[]>("/devices", signal),
  detail: (id: string, signal: AbortSignal) =>
    apiGet<DeviceSummary>(`/devices/${encodeURIComponent(id)}`, signal),
};

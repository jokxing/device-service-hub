import type { DeviceSummary } from "@device-service-hub/contracts";
import { apiRequest } from "../../shared/api/http";

export const devicesApi = {
  list: (signal?: AbortSignal) =>
    apiRequest<DeviceSummary[]>("/devices", { signal }),
  detail: (id: string, signal?: AbortSignal) =>
    apiRequest<DeviceSummary>(`/devices/${encodeURIComponent(id)}`, { signal }),
};

import type { DeviceSummary } from "@device-service-hub/contracts";
import type { AuthenticatedRead } from "../../shared/api/http";
export const resolveDeviceCode = (
  request: AuthenticatedRead,
  code: string,
  signal?: AbortSignal,
) =>
  request<DeviceSummary>(
    "/mobile/devices/resolve?code=" + encodeURIComponent(code),
    signal,
  );

export function listDevices(request: AuthenticatedRead, signal?: AbortSignal) {
  return request<DeviceSummary[]>("/mobile/devices", signal);
}

export function getDevice(
  request: AuthenticatedRead,
  id: string,
  signal?: AbortSignal,
) {
  return request<DeviceSummary>(
    "/mobile/devices/" + encodeURIComponent(id),
    signal,
  );
}

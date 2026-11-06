import "server-only";
import type { DeviceSummary } from "@device-service-hub/contracts";
import { reporterGet } from "../../auth/server/resources";
export function getDevices() {
  return reporterGet<DeviceSummary[]>("/devices");
}
export function getDevice(id: string) {
  return reporterGet<DeviceSummary>("/devices/" + encodeURIComponent(id));
}

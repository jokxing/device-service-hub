import "server-only";
import { notFound, redirect } from "next/navigation";
import type { DeviceSummary } from "@device-service-hub/contracts";
import { requireReporter } from "../../auth/server/session";
import { BackendError, backendGet } from "../../../shared/server/api";

async function readDevices<T>(route: string): Promise<T> {
  await requireReporter();
  try {
    return await backendGet<T>(route);
  } catch (error) {
    if (error instanceof BackendError && error.status === 401)
      redirect("/login");
    if (error instanceof BackendError && error.status === 404) notFound();
    throw error;
  }
}
export function getDevices() {
  return readDevices<DeviceSummary[]>("/devices");
}
export function getDevice(id: string) {
  return readDevices<DeviceSummary>("/devices/" + encodeURIComponent(id));
}

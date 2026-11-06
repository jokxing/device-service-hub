import { useCallback } from "react";
import { useApiResource } from "../../shared/hooks/useApiResource";
import type { AuthenticatedRead } from "../../shared/api/http";
import { useNativeSession } from "../auth/sessionContext";
import { getDevice, listDevices } from "./api";
function useDeviceResource<T>(
  load: (request: AuthenticatedRead, signal: AbortSignal) => Promise<T>,
) {
  const { request } = useNativeSession();
  return useApiResource(
    useCallback(
      (signal: AbortSignal) => load(request, signal),
      [load, request],
    ),
  );
}

export function useDevices() {
  return useDeviceResource(listDevices);
}

export function useDevice(id: string) {
  const load = useCallback(
    (request: AuthenticatedRead, signal: AbortSignal) =>
      getDevice(request, id, signal),
    [id],
  );
  return useDeviceResource(load);
}

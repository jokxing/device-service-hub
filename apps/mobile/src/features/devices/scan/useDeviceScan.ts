import { useCallback, useEffect, useRef, useState } from "react";
import { useFocusEffect, useRouter } from "expo-router";
import {
  decodeDeviceTag,
  parseDeviceLookupInput,
} from "@device-service-hub/contracts/device-tags";
import { useNativeSession } from "../../auth/sessionContext";
import { resolveDeviceCode } from "../api";

export function useDeviceScan() {
  const { request } = useNativeSession();
  const router = useRouter();
  const [error, setError] = useState(""),
    [pending, setPending] = useState(false),
    [paused, setPaused] = useState(false);
  const busy = useRef(false),
    scanned = useRef(false),
    mounted = useRef(true),
    revision = useRef(0),
    controller = useRef<AbortController | null>(null);
  const cancel = useCallback(() => {
    revision.current++;
    controller.current?.abort();
    busy.current = false;
    if (mounted.current) setPending(false);
  }, []);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      cancel();
    };
  }, [cancel]);
  useFocusEffect(useCallback(() => () => cancel(), [cancel]));
  async function lookup(value: string, camera: boolean) {
    if (busy.current) return;
    busy.current = true;
    setPending(true);
    setPaused(true);
    setError("");
    const current = ++revision.current;
    controller.current = new AbortController();
    try {
      const code = camera
        ? decodeDeviceTag(value)
        : parseDeviceLookupInput(value);
      const device = await resolveDeviceCode(
        request,
        code,
        controller.current.signal,
      );
      if (mounted.current && current === revision.current)
        router.replace(`/devices/${encodeURIComponent(device.id)}`);
    } catch (error) {
      if (mounted.current && current === revision.current)
        setError(
          error instanceof Error ? error.message : "设备查询失败，请重试",
        );
    } finally {
      if (current === revision.current) {
        busy.current = false;
        if (mounted.current) setPending(false);
      }
    }
  }
  return {
    pause: () => {
      scanned.current = true;
      setPaused(true);
    },
    error,
    pending,
    paused,
    onCode: (value: string) => {
      if (scanned.current) return;
      scanned.current = true;
      void lookup(value, true);
    },
    submit: (value: string) => {
      void lookup(value, false);
    },
    reset: () => {
      cancel();
      scanned.current = false;
      setError("");
      setPaused(false);
    },
  };
}

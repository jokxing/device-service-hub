import { TICKETS_APP } from "./apps.ts";

export function serviceNavigationTarget(message: unknown): string | undefined {
  if (
    !message ||
    typeof message !== "object" ||
    !("version" in message) ||
    message.version !== 1 ||
    !("action" in message)
  )
    return;
  if (message.action === "sign-in") return `${TICKETS_APP.basePath}/login`;
  if (
    message.action !== "open-device" ||
    !("deviceId" in message) ||
    typeof message.deviceId !== "string" ||
    !/^[A-Za-z0-9_-]{1,80}$/.test(message.deviceId)
  )
    return;
  return `${TICKETS_APP.basePath}/service/devices?deviceId=${encodeURIComponent(message.deviceId)}`;
}

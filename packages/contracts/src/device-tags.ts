/** Public device-label protocol. Pure functions only; no identity or transport access. */
export const DEVICE_TAG_PREFIX = "device-service-hub:v1:";
const CODE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
export function encodeDeviceTag(code: string): string {
  if (!CODE_PATTERN.test(code)) throw new Error("设备编号不支持当前二维码格式");
  return DEVICE_TAG_PREFIX + code;
}
export function decodeDeviceTag(value: string): string {
  if (!value.startsWith(DEVICE_TAG_PREFIX))
    throw new Error("不是本平台支持的设备二维码");
  const code = value.slice(DEVICE_TAG_PREFIX.length);
  if (!CODE_PATTERN.test(code)) throw new Error("设备二维码内容无效");
  return code;
}
export function parseDeviceLookupInput(value: string): string {
  const input = value.trim();
  if (input.startsWith(DEVICE_TAG_PREFIX)) return decodeDeviceTag(input);
  if (!CODE_PATTERN.test(input))
    throw new Error("请输入设备编号或本平台设备二维码内容");
  return input;
}

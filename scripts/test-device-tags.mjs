import test from "node:test";
import assert from "node:assert/strict";
import {
  decodeDeviceTag,
  encodeDeviceTag,
  parseDeviceLookupInput,
} from "../packages/contracts/src/device-tags.ts";
test("设备标签往返与手动编号保持同一业务编号", () => {
  for (const code of ["AC-001", "WP-002", "Device_3.4"]) {
    const tag = encodeDeviceTag(code);
    assert.equal(decodeDeviceTag(tag), code);
    assert.equal(parseDeviceLookupInput(" " + tag + " "), code);
    assert.equal(parseDeviceLookupInput(" " + code + " "), code);
  }
});
test("设备扫码拒绝外链、未知协议、控制字符和超长内容", () => {
  for (const value of [
    "AC-001",
    "https://example.com/AC-001",
    "javascript:alert(1)",
    "device-service-hub:v2:AC-001",
    "device-service-hub:v1:AC-001?role=admin",
    "device-service-hub:v1:../AC-001",
    "device-service-hub:v1:AC-001\n",
    "device-service-hub:v1:" + "x".repeat(65),
  ])
    assert.throws(() => decodeDeviceTag(value));
  for (const value of [
    "",
    "https://example.com/AC-001",
    "AC-001\nWP-002",
    "x".repeat(65),
  ])
    assert.throws(() => parseDeviceLookupInput(value));
});

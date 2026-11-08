import assert from "node:assert/strict";
import test from "node:test";
import { serviceNavigationTarget } from "../apps/shell/src/micro/navigation.ts";
test("Host accepts only versioned, fixed service destinations", () => {
  assert.equal(
    serviceNavigationTarget({ version: 1, action: "sign-in" }),
    "/tickets/login",
  );
  assert.equal(
    serviceNavigationTarget({
      version: 1,
      action: "open-device",
      deviceId: "device-ac001",
    }),
    "/tickets/service/devices?deviceId=device-ac001",
  );
  for (const value of [
    null,
    {},
    { version: 2, action: "sign-in" },
    { version: 1, action: "https://invalid.example" },
    ...[
      "",
      "https://invalid.example",
      "../admin",
      "a&role=admin",
      "a".repeat(81),
      null,
      {},
    ].map((deviceId) => ({ version: 1, action: "open-device", deviceId })),
  ])
    assert.equal(serviceNavigationTarget(value), undefined);
});

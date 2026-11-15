import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";

// Read back the dedicated manual acceptance order; never create/confirm buyer payments.
const local = openLocalApi(),
  android = openLocalAndroid(),
  ui = openAndroidUi(android);
const fixture = JSON.parse(
  fs.readFileSync(".local/payments/sdk-manual-order.json", "utf8"),
);
const build = JSON.parse(
  fs.readFileSync(".local/artifacts/android/build-info-local.json", "utf8"),
);
assert.equal(build.apiUrl, "http://127.0.0.1:3001/api");
assert.equal(
  createHash("sha256").update(fs.readFileSync(build.apk)).digest("hex"),
  build.sha256,
);
let token;
try {
  await local.waitForApi();
  const login = await nativeRequest("/mobile/auth/login", {
    method: "POST",
    body: {
      username: "reporter.a",
      password: process.env.SEED_ACCOUNT_PASSWORD,
    },
  });
  assert.equal(login.status, 200);
  token = login.value.accessToken;
  const route = `/mobile/orders/${fixture.orderId}/alipay-sandbox`;
  const result = await nativeRequest(route, { token });
  assert.equal(result.status, 200);
  const payment = result.value.payments.find((p) => p.checkoutKind === "app");
  assert.ok(payment);
  const query = await nativeRequest(`${route}/${payment.id}/query`, {
    token,
    method: "POST",
  });
  assert.equal(query.status, 201);
  assert.equal(
    query.value.status,
    "succeeded",
    "Requires separately completed manual sandbox buyer payment",
  );
  assert.equal(query.value.amountCents, 1);
  const safety = await nativeRequest(
    `/mobile/orders/${fixture.orderId}/payments`,
    { token },
  );
  assert.equal(safety.status, 200);
  assert.equal(safety.value.blockCancellation, true);
  android.connect();
  android.run(["reverse", "tcp:3001", "tcp:3001"]);
  android.run([
    "shell",
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    `deviceservicehub:///orders/${fixture.orderId}`,
    "-p",
    "com.deviceservicehub.app",
  ]);
  await ui.waitFor(fixture.orderCode);
  await ui.reveal("已支付");
  const xml = android.hierarchy();
  assert.ok(xml.includes("已支付"));
  assert.equal(xml.includes('content-desc="取消订单"'), false);
  assert.equal(xml.includes('content-desc="支付"'), false);
  android.capture("mobile-alipay-app-paid.png");
  console.log(
    "Passed: local signed APK checksum, dedicated APP payment verified by server, native paid readback and cancellation suppression. Buyer payment was manual; no passwords or SDK success injection.",
  );
} finally {
  if (token)
    await nativeRequest("/mobile/auth/logout", { token, method: "POST" });
}

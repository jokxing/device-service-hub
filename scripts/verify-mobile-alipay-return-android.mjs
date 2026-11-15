import assert from "node:assert/strict";
import fs from "node:fs";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";

// Dedicated order prepared locally. This test never taps a wallet payment/confirmation button.
const local = openLocalApi(),
  db = await local.connectDatabase();
const android = openLocalAndroid(),
  ui = openAndroidUi(android);
const fixture = JSON.parse(
  fs.readFileSync(".local/payments/sdk-return-order.json", "utf8"),
);
try {
  android.connect();
  android.run(["reverse", "tcp:3001", "tcp:3001"]);
  android.run(["shell", "am", "force-stop", "com.deviceservicehub.app"]);
  await ui.pause();
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
  for (let attempt = 0; attempt < 4; attempt++) {
    android.run([
      "shell",
      "input",
      "swipe",
      "360",
      "400",
      "360",
      "1100",
      "200",
    ]);
  }
  await ui.pause();
  await ui.waitFor(fixture.orderCode);
  await ui.tap("支付");
  await ui.tap("前往支付宝");
  let cashier = false;
  for (let attempt = 0; attempt < 20; attempt++) {
    await ui.pause();
    try {
      if (android.hierarchy().includes("立即付款")) {
        cashier = true;
        break;
      }
    } catch {
      /* Wallet animation can prevent an idle UI dump. */
    }
  }
  assert.ok(cashier, "Expected actual sandbox wallet cashier");
  android.capture("mobile-alipay-return-cashier.png");
  android.run(["shell", "input", "keyevent", "4"]);
  for (let attempt = 0; attempt < 8; attempt++) {
    await ui.pause();
    const xml = android.hierarchy();
    if (
      xml.includes("com.deviceservicehub.app") &&
      !xml.includes("com.eg.android.AlipayGphoneRC")
    )
      break;
    const exit = [...xml.matchAll(/<node[^>]*>/g)]
      .map(([node]) => node)
      .find((node) =>
        /text="(?:确认离开|放弃付款|取消支付|确认取消|狠心离开|离开)"/.test(
          node,
        ),
      );
    if (exit) ui.tapNode(exit);
  }
  // No refresh button or API query is used here; the returning app must reconcile itself.
  let row;
  for (let attempt = 0; attempt < 15; attempt++) {
    const result = await db.query(
      'SELECT id,status,"checkedAt" FROM "AlipaySandboxPayment" WHERE "orderId"=$1',
      [fixture.orderId],
    );
    row = result.rows[0];
    if (row?.checkedAt) break;
    await ui.pause();
  }
  assert.ok(
    row?.checkedAt,
    "Wallet return must automatically query without a manual refresh",
  );
  assert.notEqual(
    row.status,
    "succeeded",
    "Exiting wallet must not fabricate success",
  );
  await ui.reveal(row.status === "pending" ? "待核实" : "已关闭");
  const xml = android.hierarchy();
  assert.equal(xml.includes("尚未查单"), false);
  android.capture("mobile-alipay-return-reconciled.png");
  console.log(
    "Passed: actual SDK cashier -> exit without payment -> automatic server query and native local readback, no manual refresh or injected channel response.",
  );
} finally {
  await db.end();
}

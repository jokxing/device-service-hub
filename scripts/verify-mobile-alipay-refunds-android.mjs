import assert from "node:assert/strict";
import fs from "node:fs";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
import { createNativeGateway } from "./lib/native-gateway.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase();
const fixture = JSON.parse(
  fs.readFileSync(".local/payments/sdk-live-acceptance.json", "utf8"),
);
const android = openLocalAndroid(),
  ui = openAndroidUi(android),
  attempts = [];
const readback = process.argv.includes("--readback");
const route = `/api/mobile/orders/${fixture.orderId}/alipay-sandbox/${fixture.paymentId}/refund`;
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (path === route && method === "POST") {
    attempts.push({ requestId: input.requestId, reason: input.reason });
    if (status === 201 && attempts.length === 1)
      return "退款申请响应丢失，请保留原原因重试";
  }
});
try {
  await local.waitForApi();
  const before = (
    await db.query(
      'SELECT p.status,p."amountCents",r.status AS "refundStatus" FROM "AlipaySandboxPayment" p LEFT JOIN "AlipaySandboxRefund" r ON r."paymentId"=p.id WHERE p.id=$1 AND p."orderId"=$2',
      [fixture.paymentId, fixture.orderId],
    )
  ).rows[0];
  assert.equal(before?.status, "succeeded");
  assert.equal(before.amountCents, 1);
  if (readback) assert.equal(before.refundStatus, "succeeded");
  else
    assert.equal(
      before.refundStatus,
      null,
      "Requires a dedicated actually-paid order without an existing refund",
    );
  await gateway.start();
  android.connect();
  android.run(["reverse", "tcp:3001", "tcp:3002"]);
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
  for (let attempt = 0; attempt < 12; attempt++) {
    const xml = android.hierarchy();
    if (xml.includes("登录设备服务")) {
      await ui.login(
        "reporter.a",
        process.env.SEED_ACCOUNT_PASSWORD,
        "我的设备",
      );
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
      break;
    }
    if (xml.includes(fixture.orderCode)) break;
    await ui.pause();
  }
  await ui.waitFor(fixture.orderCode);
  if (!readback) {
    await ui.tap("申请退款");
    await ui.tap("提交退款申请");
    await ui.waitFor("请填写有效的退款原因");
    await ui.enter("退款原因", "DiscardDraft");
    android.run(["shell", "input", "keyevent", "4"]);
    await ui.tap("取消");
    await ui.tap("申请退款");
    assert.equal(android.hierarchy().includes('text="DiscardDraft"'), false);
    await ui.enter("退款原因", "ServicePlanChanged");
    android.run(["shell", "input", "keyevent", "4"]);
    android.capture("mobile-alipay-refund-apply.png");
    await ui.tap("提交退款申请");
    await ui.waitFor("退款申请响应丢失");
    await ui.tap("提交退款申请");
    await ui.reveal("退款待处理");
    assert.equal(attempts.length, 2);
    assert.deepEqual(attempts[0], attempts[1]);
    const rows = await db.query(
      'SELECT id,status,reason,"amountCents" FROM "AlipaySandboxRefund" WHERE "paymentId"=$1',
      [fixture.paymentId],
    );
    assert.equal(rows.rowCount, 1);
    assert.equal(rows.rows[0].status, "requested");
    assert.equal(rows.rows[0].amountCents, 1);
    android.capture("mobile-alipay-refund-requested.png");
    fs.writeFileSync(
      ".local/payments/rn-refund-request-evidence.json",
      JSON.stringify(
        {
          orderId: fixture.orderId,
          orderCode: fixture.orderCode,
          paymentId: fixture.paymentId,
          refundId: rows.rows[0].id,
          requestCount: 2,
          sameIntent: true,
          observedAt: new Date().toISOString(),
        },
        null,
        2,
      ),
    );
    console.log(
      "Passed: native reason validation/reset, full amount, injected lost response with exact UUID retry, one actual refund application, requested readback. No channel refund submitted by RN.",
    );
  } else {
    await ui.reveal("退款金额：");
    assert.match(android.hierarchy(), /text="退款成功"/);
    assert.equal(
      android.hierarchy().includes('content-desc="申请退款"'),
      false,
    );
    android.capture("mobile-alipay-refund-success.png");
    console.log(
      "Passed: native actual refund success readback and duplicate-request suppression; no injected channel result.",
    );
  }
} catch (error) {
  android.capture("mobile-alipay-refund-failure.png", true);
  throw error;
} finally {
  android.run(["reverse", "tcp:3001", "tcp:3001"]);
  await gateway.close();
  await db.end();
}

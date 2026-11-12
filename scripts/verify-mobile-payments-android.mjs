import assert from "node:assert/strict";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { createNativeGateway } from "./lib/native-gateway.mjs";
const android = openLocalAndroid(),
  ui = openAndroidUi(android),
  local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "n.pay.ui"),
  creates = [],
  confirms = [];
let v;
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (
    method === "POST" &&
    path === "/api/mobile/orders/" + v?.order.id + "/payments"
  ) {
    creates.push(input);
    if (status === 201 && creates.length === 1)
      return "创建响应丢失，请保留原意图重试";
  }
  if (
    method === "POST" &&
    path.startsWith("/api/mobile/orders/" + v?.order.id + "/payments/") &&
    path.endsWith("/mock-success")
  ) {
    confirms.push(path);
    if (status === 201 && confirms.length === 1)
      return "模拟确认响应丢失，请重试同一支付单";
  }
});
async function openLogin() {
  await ui.launch("devices", 3002);
  for (let i = 0; i < 12; i++) {
    const xml = android.hierarchy();
    if (xml.includes("登录设备服务")) return;
    if (xml.includes("我的设备") || xml.includes("我的任务")) {
      await ui.tap("退出登录");
      await ui.waitFor("登录设备服务");
      return;
    }
    await ui.pause();
  }
  throw new Error("登录入口未就绪");
}
async function top() {
  const size = android.run(["shell", "wm", "size"]).match(/(\d+)x(\d+)/);
  for (let i = 0; i < 5; i++)
    android.run([
      "shell",
      "input",
      "swipe",
      String(Math.round(Number(size[1]) * 0.9)),
      String(Math.round(Number(size[2]) * 0.25)),
      String(Math.round(Number(size[1]) * 0.9)),
      String(Math.round(Number(size[2]) * 0.8)),
      "250",
    ]);
  await ui.pause();
}
try {
  await local.waitForApi();
  const tech = await f.technician("原生模拟支付界面维修员");
  v = await f.orderedTask(tech);
  const expired = await f.orderedTask(tech);
  await gateway.start();
  await openLogin();
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "我的设备");
  await ui.launch("orders/" + v.order.id, 3002);
  await ui.waitFor(v.order.code);
  await ui.tap("创建模拟支付单");
  await ui.waitFor("渠道：本地模拟");
  android.capture("mobile-payment-create-dialog-android.png");
  await ui.tap("取消");
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "PaymentAttempt" WHERE "orderId"=$1',
        [v.order.id],
      )
    ).rows[0].n,
    0,
  );
  await ui.tap("创建模拟支付单");
  await ui.tap("确认创建模拟支付单");
  await ui.waitFor("创建响应丢失");
  await ui.tap("确认创建模拟支付单");
  await ui.reveal("待支付（模拟）");
  assert.equal(creates.length, 2);
  assert.deepEqual(creates[0], creates[1]);
  android.capture("mobile-payment-pending-android.png");
  await ui.tap("模拟支付成功");
  await ui.waitFor("确认模拟成功");
  android.capture("mobile-payment-confirm-dialog-android.png");
  await ui.tap("取消");
  assert.equal(
    (
      await db.query('SELECT status FROM "PaymentAttempt" WHERE "orderId"=$1', [
        v.order.id,
      ])
    ).rows[0].status,
    "pending",
  );
  await ui.tap("模拟支付成功");
  await ui.tap("确认模拟成功");
  await ui.waitFor("模拟确认响应丢失");
  await ui.tap("确认模拟成功");
  await ui.reveal("已成功（模拟）");
  assert.equal(confirms.length, 2);
  assert.equal(confirms[0], confirms[1]);
  android.capture("mobile-payment-succeeded-android.png");
  await ui.launch("orders/" + v.order.id, 3002);
  await ui.waitFor(v.order.code);
  await ui.reveal("已成功（模拟）");
  assert(!android.hierarchy().includes('content-desc="取消订单"'));
  await ui.launch("tickets/" + v.ticket.id, 3002);
  await ui.waitFor(v.ticket.title);
  await ui.reveal("查看订单详情");
  assert(!android.hierarchy().includes('content-desc="取消订单"'));
  android.capture("mobile-payment-ticket-gate-android.png");
  await ui.launch("orders/" + expired.order.id, 3002);
  await ui.waitFor(expired.order.code);
  await ui.tap("创建模拟支付单");
  await ui.tap("确认创建模拟支付单");
  await ui.reveal("待支付（模拟）");
  const p = (
    await db.query('SELECT id FROM "PaymentAttempt" WHERE "orderId"=$1', [
      expired.order.id,
    ])
  ).rows[0];
  await db.query(
    `UPDATE "PaymentAttempt" SET "expiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-interval '1 second' WHERE id=$1`,
    [p.id],
  );
  await top();
  await ui.tap("刷新查单（模拟）");
  await ui.reveal("已超时关闭（模拟）");
  android.capture("mobile-payment-expired-android.png");
  await ui.tap("创建模拟支付单");
  await ui.tap("确认创建模拟支付单");
  await ui.reveal("待支付（模拟）");
  const records = (
    await db.query(
      'SELECT id,status FROM "PaymentAttempt" WHERE "orderId"=$1',
      [expired.order.id],
    )
  ).rows;
  assert.equal(records.length, 2);
  assert.equal(records.filter((row) => row.status === "pending").length, 1);
  assert.equal(records.find((row) => row.id === p.id).status, "closed");
  console.log(
    "Android mock payment create/confirm cancel, lost-response retries, cold reread, paid cancellation gates, refresh expiry and recreation passed. Expo Go only; no real payment.",
  );
} catch (e) {
  android.capture("mobile-payments-failure.png", true);
  throw e;
} finally {
  android.run(["reverse", "tcp:3001", "tcp:3001"]);
  for (const token of gateway.sessions)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await gateway.close();
  await f.cleanup();
  await db.end();
}

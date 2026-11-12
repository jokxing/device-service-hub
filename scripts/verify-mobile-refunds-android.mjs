import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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
  f = quoteFixtures(local, db, "n.refund.ui"),
  attempts = [];
let v, p;
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (
    method === "POST" &&
    path ===
      "/api/mobile/orders/" + v?.order.id + "/payments/" + p?.id + "/refund"
  ) {
    attempts.push(input);
    if (status === 201 && attempts.length === 1)
      return "退款申请响应丢失，请保留原原因重试";
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
  const tech = await f.technician("原生退款界面维修员"),
    { reporter, admin } = await f.identities();
  v = await f.orderedTask(tech);
  const created = await local.request("/orders/" + v.order.id + "/payments", {
    cookie: reporter,
    method: "POST",
    body: { requestId: randomUUID() },
  });
  assert.equal(created.response.status, 201);
  p = created.value;
  await gateway.start();
  await openLogin();
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "我的设备");
  await ui.launch("orders/" + v.order.id, 3002);
  await ui.waitFor(v.order.code);
  await ui.tap("模拟支付成功");
  await ui.waitFor("请核对支付单编号与金额");
  android.capture("mobile-payment-confirm-check-android.png");
  await ui.tap("确认模拟成功");
  await ui.reveal("已成功（模拟）");
  await ui.tap("申请模拟退款");
  await ui.tap("提交模拟退款申请");
  await ui.waitFor("请填写有效的退款原因");
  await ui.enter("退款原因", "Plan-changed");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.tap("取消");
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "MockRefundRequest" WHERE "paymentId"=$1',
        [p.id],
      )
    ).rows[0].n,
    0,
  );
  await ui.tap("申请模拟退款");
  assert(!android.hierarchy().includes('text="Plan-changed"'));
  await ui.enter("退款原因", "Plan-changed");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.pause();
  android.capture("mobile-refund-request-dialog-android.png");
  await ui.tap("提交模拟退款申请");
  await ui.waitFor("退款申请响应丢失");
  await ui.tap("提交模拟退款申请");
  await ui.reveal("退款申请待处理（模拟）");
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], attempts[1]);
  android.capture("mobile-refund-requested-android.png");
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "MockRefundRequest" WHERE "paymentId"=$1',
        [p.id],
      )
    ).rows[0].n,
    1,
  );
  await ui.launch("orders/" + v.order.id, 3002);
  await ui.waitFor(v.order.code);
  await ui.reveal("Plan-changed");
  const version = (
    await db.query('SELECT version FROM "Ticket" WHERE id=$1', [v.ticket.id])
  ).rows[0].version;
  const start = await local.request("/orders/" + v.order.id + "/start", {
    cookie: tech.cookie,
    method: "POST",
    body: { requestId: randomUUID(), expectedVersion: version },
  });
  assert.equal(start.response.status, 409);
  const completed = await local.request(
    "/orders/" + v.order.id + "/payments/" + p.id + "/refund/mock-success",
    { cookie: admin, method: "POST", body: { requestId: randomUUID() } },
  );
  assert.equal(completed.response.status, 201);
  await top();
  await ui.tap("刷新查单（模拟）");
  await ui.reveal("退款成功（模拟）");
  android.capture("mobile-refund-completed-android.png");
  await ui.reveal("处理人：");
  android.capture("mobile-refund-completion-record-android.png");
  await ui.launch("orders/" + v.order.id, 3002);
  await ui.waitFor(v.order.code);
  await ui.waitFor("已取消");
  android.capture("mobile-refund-order-cancelled-android.png");
  const result = await local.request("/orders/" + v.order.id, {
    cookie: reporter,
  });
  assert.equal(result.value.status, "cancelled");
  assert.equal(result.value.ticket.status, "cancelled");
  assert.equal(result.value.totalCents, v.order.totalCents);
  console.log(
    "Android confirmation hint, refund reason validation/reset, close no write, exact response-loss replay, requested state, start hold and Web-admin completion refresh/cold reread passed. Mock only.",
  );
} catch (e) {
  android.capture("mobile-refunds-failure.png", true);
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

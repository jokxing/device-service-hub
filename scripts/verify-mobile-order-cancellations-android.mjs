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
  f = quoteFixtures(local, db, "n.cancel.ui"),
  attempts = [];
let v;
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (
    method === "POST" &&
    path === "/api/mobile/orders/" + v?.order.id + "/cancel"
  ) {
    attempts.push(input);
    if (
      status === 201 &&
      attempts.filter((x) => x.reason === "No-longer-needed").length === 1
    )
      return "取消响应丢失，请保留原原因重试";
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
try {
  await local.waitForApi();
  const tech = await f.technician("原生取消界面维修员");
  v = await f.orderedTask(tech);
  const stale = await f.orderedTask(tech);
  await gateway.start();
  await openLogin();
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "我的设备");
  await ui.launch("orders/" + v.order.id, 3002);
  await ui.waitFor(v.order.code);
  await ui.tap("取消订单");
  await ui.tap("确认取消订单");
  await ui.waitFor("请填写有效的取消原因");
  await ui.enter("取消原因", "No-longer-needed");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.pause();
  await ui.tap("取消");
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "ServiceOrderCancellation" WHERE "orderId"=$1',
        [v.order.id],
      )
    ).rows[0].n,
    0,
  );
  await ui.tap("取消订单");
  assert(!android.hierarchy().includes('text="No-longer-needed"'));
  await ui.enter("取消原因", "No-longer-needed");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.pause();
  android.capture("mobile-order-cancel-dialog-android.png");
  await ui.tap("确认取消订单");
  await ui.waitFor("取消响应丢失");
  await ui.tap("确认取消订单");
  await ui.reveal("No-longer-needed");
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], attempts[1]);
  android.capture("mobile-order-cancelled-android.png");
  await ui.launch("orders/" + v.order.id, 3002);
  await ui.waitFor(v.order.code);
  await ui.reveal("No-longer-needed");
  const state = (
    await db.query(
      'SELECT t.status,o.status AS "orderStatus",(SELECT count(*)::int FROM "ServiceOrderCancellation" c WHERE c."orderId"=o.id) n FROM "Ticket" t JOIN "ServiceOrder" o ON o."ticketId"=t.id WHERE t.id=$1',
      [v.ticket.id],
    )
  ).rows[0];
  assert.equal(state.status, "cancelled");
  assert.equal(state.orderStatus, "cancelled");
  assert.equal(state.n, 1);
  await ui.launch("orders/" + stale.order.id, 3002);
  await ui.waitFor(stale.order.code);
  await ui.tap("取消订单");
  const r = await local.request("/orders/" + stale.order.id + "/start", {
    cookie: tech.cookie,
    method: "POST",
    body: { requestId: randomUUID(), expectedVersion: stale.ticket.version },
  });
  assert.equal(r.response.status, 201);
  await ui.enter("取消原因", "Stale-window");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.tap("确认取消订单");
  await ui.waitFor("当前不能取消");
  android.capture("mobile-order-cancel-conflict-android.png");
  await ui.tap("取消");
  await ui.reveal("维修中");
  assert(!android.hierarchy().includes('content-desc="取消订单"'));
  android.capture("mobile-order-cancel-after-start-android.png");
  console.log(
    "Android cancel reason validation/reset, close no write, lost-response exact retry, persisted cancellation and started stale-window conflict passed.",
  );
} catch (e) {
  android.capture("mobile-order-cancel-failure.png", true);
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

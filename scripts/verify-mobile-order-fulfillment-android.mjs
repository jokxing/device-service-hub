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
  f = quoteFixtures(local, db, "n.fulfill.ui"),
  attempts = [];
let v;
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (
    method === "POST" &&
    path === "/api/mobile/orders/" + v?.order.id + "/start"
  ) {
    attempts.push(input);
    if (status === 201 && attempts.length === 1)
      return "开工响应丢失，请保持原意图重试";
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
  const tech = await f.technician("原生开工界面维修员");
  v = await f.orderedTask(tech);
  await gateway.start();
  await openLogin();
  await ui.login(tech.id, process.env.SEED_ACCOUNT_PASSWORD, "我的任务");
  await ui.launch("tasks/" + v.ticket.id, 3002);
  await ui.waitFor(v.ticket.title);
  await ui.tap("订单开工");
  await ui.waitFor("确认订单开工");
  android.capture("mobile-order-start-dialog-android.png");
  await ui.tap("取消");
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "ServiceOrderStart" WHERE "orderId"=$1',
        [v.order.id],
      )
    ).rows[0].n,
    0,
  );
  await ui.tap("订单开工");
  await ui.tap("确认开工");
  await ui.waitFor("开工响应丢失");
  await ui.tap("确认开工");
  await ui.reveal("维修中");
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], attempts[1]);
  android.capture("mobile-order-started-android.png");
  await ui.tap("提交处理结果");
  await ui.enter("处理说明", "Fixed-wiring");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.pause();
  android.capture("mobile-order-result-dialog-android.png");
  await ui.tap("提交结果");
  await ui.pause();
  await ui.launch("tasks/" + v.ticket.id, 3002);
  await ui.waitFor(v.ticket.title);
  await ui.reveal("待用户确认");
  android.capture("mobile-order-awaiting-confirmation-android.png");
  await openLogin();
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "我的设备");
  await ui.launch("tickets/" + v.ticket.id, 3002);
  await ui.waitFor(v.ticket.title);
  await ui.tap("确认维修完成");
  await ui.waitFor("Fixed-wiring");
  await ui.tap("确认完成");
  await ui.pause();
  await ui.launch("orders/" + v.order.id, 3002);
  await ui.waitFor(v.order.code);
  await ui.waitFor("已完成");
  android.capture("mobile-order-completed-android.png");
  const result = await local.request("/orders/" + v.order.id, {
    cookie: (await f.identities()).reporter,
  });
  assert.equal(result.value.status, "completed");
  assert.equal(result.value.ticket.status, "completed");
  assert.equal(result.value.totalCents, v.order.totalCents);
  await ui.launch("orders", 3002);
  await ui.waitFor(v.order.code);
  await ui.reveal("创建时间");
  const xml = android.hierarchy();
  assert(!/创建时间[^<]*T\d{2}:/.test(xml));
  android.capture("mobile-order-created-time-android.png");
  console.log(
    "Android start cancel/no write, lost-response same-intent retry, result submission, reporter completion, order/ticket final state and local time display passed.",
  );
} catch (e) {
  android.capture("mobile-order-fulfillment-failure.png", true);
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

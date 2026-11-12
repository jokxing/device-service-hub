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
  f = quoteFixtures(local, db, "nq.flow.ui"),
  gateway = createNativeGateway(() => {});
async function revealControl(label) {
  for (let n = 0; n < 10; n++) {
    const node = ui.nodeFor(android.hierarchy(), label);
    const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    if (bounds && Number(bounds[4]) > Number(bounds[2])) return;
    const size = android.run(["shell", "wm", "size"]).match(/(\d+)x(\d+)/);
    android.run([
      "shell",
      "input",
      "swipe",
      String(Math.round(Number(size[1]) * 0.91)),
      String(Math.round(Number(size[2]) * 0.62)),
      String(Math.round(Number(size[1]) * 0.91)),
      String(Math.round(Number(size[2]) * 0.32)),
      "300",
    ]);
    await ui.pause();
  }
  throw new Error("Modal control missing: " + label);
}
async function enter(label, value) {
  await revealControl(label);
  await ui.enter(label, value);
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.pause();
}
try {
  await local.waitForApi();
  const tech = await f.technician("修订订单界面维修员"),
    v = await f.quotedTask(tech);
  const { reporter } = await f.identities();
  let r = await local.request("/tickets/" + v.ticket.id + "/quote/reject", {
    cookie: reporter,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: v.ticket.version,
      quoteId: v.quote.id,
      quoteRevision: 1,
      reason: "Budget-limit",
    },
  });
  assert.equal(r.response.status, 201);
  await gateway.start();
  await ui.openLogin(3002);
  await ui.login(tech.id, process.env.SEED_ACCOUNT_PASSWORD, "我的任务");
  await ui.launch("tasks/" + v.ticket.id, 3002);
  await ui.waitFor(v.ticket.title);
  await ui.tap("修订报价");
  await ui.waitFor("将生成第 2 版");
  assert(android.hierarchy().includes("19.99"));
  await enter("单价（元） 1", "10.00");
  android.capture("mobile-quote-revision-dialog-android.png");
  await ui.tap("提交报价");
  await ui.reveal("第 2 版");
  android.capture("mobile-quote-revised-android.png");
  const rows = (
    await db.query(
      'SELECT id,revision,status,"totalCents" FROM "TicketQuote" WHERE "ticketId"=$1 ORDER BY revision',
      [v.ticket.id],
    )
  ).rows;
  assert.equal(rows.length, 2);
  assert.equal(rows[0].status, "rejected");
  assert.equal(rows[1].totalCents, 3001);
  r = await local.request("/tickets/" + v.ticket.id + "/quote/accept", {
    cookie: reporter,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: v.ticket.version + 2,
      quoteId: rows[1].id,
      quoteRevision: 2,
    },
  });
  assert.equal(r.response.status, 201);
  const order = r.value;
  await ui.openLogin(3002);
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "我的设备");
  await ui.tap("我的订单");
  await ui.waitFor(order.code);
  android.capture("mobile-orders-list-android.png");
  await ui.tap("查看订单详情");
  await ui.waitFor(order.code);
  await ui.waitFor("报价版本：第 2 版");
  android.capture("mobile-order-detail-android.png");
  await ui.tap("返回我的订单");
  await ui.waitFor("全部订单");
  await ui.tap("已取消");
  await ui.waitFor("刷新订单");
  assert(!android.hierarchy().includes(order.code));
  android.capture("mobile-orders-filtered-android.png");
  console.log(
    "Android revision prefill/new version, immutable history, reporter order entry/list/detail/back/status filter passed.",
  );
} catch (e) {
  android.capture("mobile-negotiation-failure.png", true);
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

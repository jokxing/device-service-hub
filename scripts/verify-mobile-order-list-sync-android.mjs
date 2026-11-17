import assert from "node:assert/strict";

import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "focus.cancel"),
  a = openLocalAndroid(),
  ui = openAndroidUi(a);
try {
  const tech = await f.technician("分页同步测试维修员");
  const v = await f.orderedTask(tech);
  await f.identities();
  await ui.launch("devices", 3001);
  await ui.pause();
  if (a.hierarchy().includes("登录设备服务"))
    await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "我的设备");
  await ui.launch("orders", 3001);
  await ui.waitFor(v.order.code);
  await ui.tap("查看订单详情");
  await ui.waitFor(v.order.code);
  await ui.tap("取消订单");
  await ui.enter("取消原因", "Focus-sync");
  a.run(["shell", "input", "keyevent", "4"]);
  await ui.tap("确认取消订单");
  await ui.waitFor("已取消");
  a.run(["shell", "input", "keyevent", "4"]);
  await ui.waitFor("我的订单");
  await ui.waitFor(v.order.code);
  await ui.waitFor("已取消");
  const result = await local.request("/orders/" + v.order.id, {
    cookie: await local.login("reporter.a"),
  });
  assert.equal(result.value.status, "cancelled");
  a.capture("mobile-order-return-synced.png", true);
  console.log(
    "Actual native detail cancellation -> Android Back -> list automatically reread cancelled status, without tapping refresh.",
  );
} finally {
  a.run(["reverse", "tcp:3001", "tcp:3001"]);
  await f.cleanup();
  await db.end();
}

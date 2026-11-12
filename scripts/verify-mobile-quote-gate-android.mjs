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
  f = quoteFixtures(local, db, "quote.gate"),
  gateway = createNativeGateway(() => {});
try {
  await local.waitForApi();
  const tech = await f.technician("报价入口验收维修员"),
    v = await f.quotedTask(tech);
  await gateway.start();
  await ui.openLogin(3002);
  await ui.login(tech.id, process.env.SEED_ACCOUNT_PASSWORD, "我的任务");
  await ui.launch("tasks/" + v.ticket.id, 3002);
  await ui.waitFor(v.ticket.title);
  await ui.reveal("刷新任务详情");
  const xml = android.hierarchy();
  assert.equal(xml.includes('content-desc="提交处理结果"'), false);
  assert.ok(xml.includes("待用户确认"));
  android.capture("mobile-quote-saved-android.png");
  const direct = await f.task(tech);
  await ui.launch("tasks/" + direct.id, 3002);
  await ui.waitFor(direct.title);
  await ui.reveal("提交处理结果");
  assert.ok(ui.nodeFor(android.hierarchy(), "提交处理结果"));
  console.log(
    "Android quote result gate: quoted task hides direct result action and displays quote; direct task retains result action.",
  );
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

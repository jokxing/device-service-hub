import assert from "node:assert/strict";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = taskFixtures(local, db, "ticket.focus"),
  a = openLocalAndroid(),
  ui = openAndroidUi(a);
try {
  const tech = await f.technician("报修返回同步维修员");
  await f.identities();
  const ticket = await f.task(tech, {
    stage: "confirming",
    title: "Return-sync-" + Date.now(),
  });
  await ui.launch("devices", 3001);
  await ui.pause();
  if (a.hierarchy().includes("登录设备服务"))
    await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "我的设备");
  await ui.launch("tickets", 3001);
  await ui.waitFor(ticket.title);
  await ui.tap("查看报修详情");
  await ui.waitFor(ticket.title);
  await ui.tap("确认维修完成");
  await ui.tap("确认完成");
  await ui.waitFor("已完成");
  a.run(["shell", "input", "keyevent", "4"]);
  await ui.waitFor("我的报修");
  await ui.waitFor(ticket.title);
  await ui.waitFor("已完成");
  const result = await db.query('SELECT status FROM "Ticket" WHERE id=$1', [
    ticket.id,
  ]);
  assert.equal(result.rows[0].status, "completed");
  a.capture("mobile-ticket-return-synced.png", true);
  console.log(
    "Native ticket confirmation -> Back -> list automatically shows completed, without refresh.",
  );
} finally {
  a.run(["reverse", "tcp:3001", "tcp:3001"]);
  await f.cleanup();
  await db.end();
}

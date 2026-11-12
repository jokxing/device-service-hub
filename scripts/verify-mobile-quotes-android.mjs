import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { createNativeGateway } from "./lib/native-gateway.mjs";
const android = openLocalAndroid(),
  ui = openAndroidUi(android),
  local = openLocalApi(),
  db = await local.connectDatabase(),
  f = taskFixtures(local, db, "quote.android");
let task;
const attempts = [];
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (method === "POST" && path === `/api/mobile/tasks/${task?.id}/quote`) {
    attempts.push(input);
    if (status === 201 && attempts.length === 1)
      return "报价响应丢失，请保持相同内容重试";
  }
});
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
  const tech = await f.technician("原生报价界面维修员");
  task = await f.task(tech, {
    serviceMode: "quoted",
    title: "RN-quote-" + randomUUID().slice(0, 8),
  });
  await gateway.start();
  await ui.openLogin(3002);
  await ui.login(tech.id, process.env.SEED_ACCOUNT_PASSWORD, "我的任务");
  await ui.launch("tasks/" + task.id, 3002);
  await ui.waitFor(task.title);
  await ui.tap("编制报价");
  await ui.waitFor("编制维修报价");
  await ui.tap("提交报价");
  await ui.waitFor("请填写有效的项目名称");
  await enter("项目名称 1", "Board");
  await ui.tap("取消");
  await ui.tap("编制报价");
  assert.equal(android.hierarchy().includes('text="Board"'), false);
  await enter("项目名称 1", "Board");
  await enter("数量 1", "2");
  await enter("单价（元） 1", "120.501");
  await ui.tap("提交报价");
  await ui.waitFor("最多两位小数");
  await enter("单价（元） 1", "120.50");
  await enter("备注 1", "Install");
  await revealControl("添加报价条目");
  await ui.tap("添加报价条目");
  await enter("项目名称 2", "Check");
  await enter("单价（元） 2", "0.01");
  await revealControl("添加报价条目");
  await ui.waitFor("241.01");
  android.capture("mobile-quote-form-android.png");
  await ui.tap("提交报价");
  await ui.waitFor("报价响应丢失");
  await ui.tap("提交报价");
  await ui.reveal("待用户确认");
  await ui.waitFor("待用户确认");
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], attempts[1]);
  assert.equal(attempts[0].items.length, 2);
  const records = (
    await db.query(
      'SELECT id,"totalCents" FROM "TicketQuote" WHERE "ticketId"=$1',
      [task.id],
    )
  ).rows;
  assert.equal(records.length, 1);
  assert.equal(records[0].totalCents, 24101);
  await ui.reveal("报价合计");
  assert.equal(
    android.hierarchy().includes('content-desc="提交处理结果"'),
    false,
  );
  android.capture("mobile-quote-saved-android.png");
  await ui.launch("tasks/" + task.id, 3002);
  await ui.waitFor(task.title);
  await ui.reveal("维修报价");
  await ui.waitFor("待用户确认");
  assert.equal(android.hierarchy().includes('content-desc="编制报价"'), false);
  console.log(
    "Android quote: empty/decimal validation, cancel reset, two items and exact amount, response loss same UUID/version retry, one persisted quote and cold reread passed.",
  );
} catch (error) {
  android.capture("mobile-quote-failure.png", true);
  throw error;
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

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { createNativeGateway } from "./lib/native-gateway.mjs";
const android = openLocalAndroid();
const ui = openAndroidUi(android);
const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "result.native.ui");
let task;
const attempts = [];
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (method !== "POST" || path !== `/api/mobile/tasks/${task?.id}/result`)
    return;
  attempts.push(input);
  if (status === 201 && attempts.length === 1)
    return "网关未收到处理结果，请保留原内容重试";
});
async function audit(id) {
  return (
    await db.query(
      'SELECT t."status",r."description",COUNT(r."id")::int AS count FROM "Ticket" t LEFT JOIN "TicketResult" r ON r."ticketId"=t."id" WHERE t."id"=$1 GROUP BY t."id",r."description"',
      [id],
    )
  ).rows[0];
}
async function openTask(value) {
  await ui.launch("tasks/" + value.id, 3002);
  await ui.waitFor(value.title);
}
async function scrollTop() {
  const size = android.run(["shell", "wm", "size"]).match(/(\d+)x(\d+)/);
  assert.ok(size);
  for (let i = 0; i < 3; i++)
    android.run([
      "shell",
      "input",
      "swipe",
      String(Math.round(Number(size[1]) * 0.92)),
      String(Math.round(Number(size[2]) * 0.3)),
      String(Math.round(Number(size[1]) * 0.92)),
      String(Math.round(Number(size[2]) * 0.8)),
      "300",
    ]);
  await ui.pause();
}
try {
  await local.waitForApi();
  const tech = await fixtures.technician("原生结果界面维修员");
  const stale = await fixtures.task(tech, {
    title: "RN-stale-result-" + randomUUID().slice(0, 8),
  });
  task = await fixtures.task(tech, {
    title: "RN-result-" + randomUUID().slice(0, 8),
  });
  await gateway.start();
  await ui.openLogin(3002);
  await ui.login(tech.id, process.env.SEED_ACCOUNT_PASSWORD, "我的任务");
  await openTask(task);
  await ui.tap("提交处理结果");
  await ui.tap("提交结果");
  assert.equal(
    ui.nodeFor(android.hierarchy(), "提交结果")?.includes('enabled="false"'),
    true,
  );
  assert.deepEqual(await audit(task.id), {
    status: "processing",
    description: null,
    count: 0,
  });
  await scrollTop();
  await ui.enter("处理说明", "Discard-result");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.tap("取消");
  assert.equal((await audit(task.id)).count, 0);
  await ui.tap("提交处理结果");
  await ui.waitFor("填写处理结果");
  assert.equal(
    ui.nodeFor(android.hierarchy(), "处理说明")?.includes("Discard-result"),
    false,
  );
  await ui.enter("处理说明", "Fixed-wiring");
  android.run(["shell", "input", "keyevent", "66"]);
  android.run(["shell", "input", "text", "Retested"]);
  android.run(["shell", "input", "keyevent", "4"]);
  android.capture("mobile-android-result-form.png");
  await ui.tap("提交结果");
  await ui.waitFor("网关未收到处理结果");
  await ui.tap("提交结果");
  await ui.waitFor("待确认");
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], attempts[1]);
  assert.deepEqual(await audit(task.id), {
    status: "confirming",
    description: "Fixed-wiring\nRetested",
    count: 1,
  });
  await ui.reveal("Retested");
  android.capture("mobile-android-result-submitted.png");
  await openTask(task);
  await ui.reveal("Retested");
  await openTask(stale);
  await ui.tap("提交处理结果");
  await ui.enter("处理说明", "Late-result");
  android.run(["shell", "input", "keyevent", "4"]);
  const external = await local.request(`/tasks/${stale.id}/result`, {
    method: "POST",
    cookie: tech.cookie,
    body: {
      requestId: randomUUID(),
      expectedVersion: stale.version,
      description: "External-result",
    },
  });
  assert.equal(external.response.status, 201);
  await ui.tap("提交结果");
  await ui.waitFor("任务已变化或结果已提交");
  await scrollTop();
  assert.equal(
    ui.nodeFor(android.hierarchy(), "处理说明")?.includes("Late-result"),
    true,
  );
  await ui.tap("取消");
  await ui.reveal("External-result");
  assert.equal((await audit(stale.id)).description, "External-result");
  await ui.openLogin(3002);
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "AC-001");
  await ui.launch("tickets/" + task.id, 3002);
  await ui.waitFor(task.title);
  await ui.reveal("Retested");
  android.capture("mobile-android-result-reporter.png");
  await ui.tap("确认维修完成");
  await ui.tap("确认完成");
  await ui.waitFor("已完成");
  assert.deepEqual(await audit(task.id), {
    status: "completed",
    description: "Fixed-wiring\nRetested",
    count: 1,
  });
  console.log(
    JSON.stringify(
      {
        result: "passed",
        environment: "MuMu Android + Expo Go",
        checks: [
          "Empty submit disabled; cancel and reopen clear the input",
          "Multiline result and same-intent response-loss retry store one record",
          "Cold restart keeps the result; stale modal keeps input and cannot overwrite",
          "Reporter reads same result and confirms completion through RN",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  android.capture("mobile-results-failure.png", true);
  throw error;
} finally {
  android.run(["reverse", "tcp:3001", "tcp:3001"]);
  for (const token of gateway.sessions)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await gateway.close();
  await fixtures.cleanup();
  await db.end();
}

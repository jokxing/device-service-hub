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
const fixtures = taskFixtures(local, db, "task.native.ui");
let task;
const attempts = [];
const listReads = [];
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (method === "GET" && path.startsWith("/api/mobile/tasks?"))
    listReads.push(path);
  if (method !== "POST" || path !== `/api/mobile/tasks/${task?.id}/accept`)
    return;
  attempts.push(input);
  if (status === 201 && attempts.length === 1)
    return "网关未收到接单结果，请保留原意图重试";
});
const title = (prefix) => prefix + randomUUID().slice(0, 8);
async function audit(id) {
  return (
    await db.query(
      'SELECT t."status",COUNT(a."id")::int AS count FROM "Ticket" t LEFT JOIN "TicketAcceptance" a ON a."ticketId"=t."id" WHERE t."id"=$1 GROUP BY t."id"',
      [id],
    )
  ).rows[0];
}
async function openTask(value) {
  await ui.launch("tasks/" + value.id, 3002);
  await ui.waitFor(value.title);
}
try {
  await local.waitForApi();
  const tech = await fixtures.technician("原生接单维修甲"),
    other = await fixtures.technician("原生接单维修乙");
  const otherTask = await fixtures.task(other, {
    stage: "assigned",
    title: title("RN-other-"),
  });
  const stale = await fixtures.task(tech, {
    stage: "assigned",
    title: title("RN-stale-"),
  });
  task = await fixtures.task(tech, {
    stage: "assigned",
    title: title("RN-task-"),
  });
  await gateway.start();
  await ui.openLogin(3002);
  await ui.login(tech.id, process.env.SEED_ACCOUNT_PASSWORD, "我的任务");
  await ui.waitFor(task.title);
  assert.equal(android.hierarchy().includes(otherTask.title), false);
  await ui.tap("待接单");
  await ui.waitFor(task.title);
  android.capture("mobile-android-tasks.png");
  const resolution = android.run(["shell", "wm", "size"]).match(/(\d+)x(\d+)/);
  assert.ok(resolution);
  function assertHeaderLogout() {
    const node = ui.nodeFor(android.hierarchy(), "退出登录");
    const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
    assert.ok(
      bounds && Number(bounds[4]) <= Number(resolution[2]) * 0.2,
      "Logout must remain in the fixed navigation header",
    );
  }
  assertHeaderLogout();
  // Repeated custom returns must preserve the original filtered list, not stack copies.
  for (let attempt = 0; attempt < 2; attempt++) {
    await ui.tap("查看任务详情");
    await ui.waitFor(task.title);
    const readsBefore = listReads.length;
    await ui.tap("返回我的任务");
    await ui.waitFor(task.title);
    assert.ok(
      listReads.length > readsBefore &&
        listReads.at(-1).includes("status=assigned"),
      "Returning must refresh the existing filtered list",
    );
    assertHeaderLogout();
  }
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.pause();
  assert.equal(
    android.hierarchy().includes("当前筛选"),
    false,
    "Android Back must not reveal another copy of the task list",
  );
  await ui.launch("tasks", 3002);
  await ui.waitFor(task.title);
  await ui.tap("待接单");
  await ui.waitFor(task.title);
  await ui.tap("查看任务详情");
  await ui.waitFor(task.title);
  await ui.tap("接单");
  await ui.waitFor("接单确认");
  android.capture("mobile-android-accept-dialog.png");
  await ui.tap("取消");
  assert.deepEqual(await audit(task.id), { status: "assigned", count: 0 });
  await ui.tap("接单");
  await ui.tap("确认接单");
  await ui.waitFor("网关未收到接单结果");
  await ui.tap("确认接单");
  await ui.waitFor("处理中");
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], attempts[1]);
  assert.deepEqual(await audit(task.id), { status: "processing", count: 1 });
  android.capture("mobile-android-task-accepted.png");
  await openTask(task);
  await ui.waitFor("处理中");
  await ui.tap("返回我的任务");
  await ui.waitFor(task.title);
  await ui.tap("待接单");
  await ui.waitFor(stale.title);
  assert.equal(android.hierarchy().includes(task.title), false);
  await openTask(stale);
  await ui.tap("接单");
  const external = await local.request(`/tasks/${stale.id}/accept`, {
    method: "POST",
    cookie: tech.cookie,
    body: { requestId: randomUUID(), expectedVersion: stale.version },
  });
  assert.equal(external.response.status, 201);
  await ui.tap("确认接单");
  await ui.waitFor("任务已变化或已接单");
  await ui.tap("取消");
  await ui.waitFor("处理中");
  await ui.openLogin(3002);
  await ui.login(other.id, process.env.SEED_ACCOUNT_PASSWORD, "我的任务");
  await ui.waitFor(otherTask.title);
  assert.equal(android.hierarchy().includes(task.title), false);
  await openTaskDenied();
  await ui.tap("返回我的任务");
  await ui.waitFor(otherTask.title);
  await ui.reveal("下一页");
  assertHeaderLogout();
  await ui.tap("退出登录");
  await ui.waitFor("登录设备服务");
  assert.equal(
    (await nativeRequest("/mobile/auth/me", { token: gateway.sessions.at(-1) }))
      .status,
    401,
  );
  console.log(
    JSON.stringify(
      {
        result: "passed",
        environment: "MuMu Android + Expo Go",
        checks: [
          "Technician login routes to scoped task cards and status filter",
          "Repeated detail returns preserve filter and do not duplicate the list",
          "Header logout stays visible after scrolling and revokes the session",
          "Cancel leaves task unchanged; lost response retries same UUID/version once",
          "Accepted task and cold restart persist; filter refreshes actual state",
          "Stale modal conflict and account switch deny other technician task",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  android.capture("mobile-tasks-failure.png", true);
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
async function openTaskDenied() {
  await ui.launch("tasks/" + task.id, 3002);
  await ui.waitFor("任务不存在或无权访问");
}

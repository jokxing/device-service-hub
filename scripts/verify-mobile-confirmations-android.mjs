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
const fixtures = taskFixtures(local, db, "confirm.native.ui");
let ticket;
const attempts = [];
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (method !== "POST" || path !== `/api/mobile/tickets/${ticket?.id}/confirm`)
    return;
  attempts.push(input);
  if (status === 201 && attempts.length === 1)
    return "网关未收到确认结果，请保留原意图重试";
});
async function openTicket(value) {
  await ui.launch("tickets/" + value.id, 3002);
  await ui.waitFor(value.title);
}
async function status(id) {
  return (
    await db.query(
      'SELECT t."status",COUNT(c."id")::int AS count FROM "Ticket" t LEFT JOIN "TicketConfirmation" c ON c."ticketId"=t."id" WHERE t."id"=$1 GROUP BY t."id"',
      [id],
    )
  ).rows[0];
}
try {
  await local.waitForApi();
  const tech = await fixtures.technician("原生确认界面维修员");
  const { reporter } = await fixtures.identities();
  ticket = await fixtures.task(tech, {
    stage: "confirming",
    title: "RN-confirm-" + randomUUID().slice(0, 8),
  });
  const stale = await fixtures.task(tech, {
    stage: "confirming",
    title: "RN-stale-" + randomUUID().slice(0, 8),
  });
  await gateway.start();
  await ui.openLogin(3002);
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "AC-001");
  await openTicket(ticket);
  await ui.tap("确认维修完成");
  await ui.waitFor("请核对处理结果与设备实际情况");
  android.capture("mobile-android-confirm-dialog.png");
  await ui.tap("取消");
  assert.deepEqual(await status(ticket.id), { status: "confirming", count: 0 });
  await ui.tap("确认维修完成");
  await ui.tap("确认完成");
  await ui.waitFor("网关未收到确认结果");
  assert.deepEqual(await status(ticket.id), { status: "completed", count: 1 });
  await ui.tap("确认完成");
  await ui.waitFor("已完成");
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], attempts[1]);
  assert.deepEqual(await status(ticket.id), { status: "completed", count: 1 });
  android.capture("mobile-android-confirmed.png");
  await openTicket(ticket);
  await ui.waitFor("已完成");
  await openTicket(stale);
  await ui.tap("确认维修完成");
  const external = await local.request(`/tickets/${stale.id}/confirm`, {
    cookie: reporter,
    method: "POST",
    body: { requestId: randomUUID(), expectedVersion: stale.version },
  });
  assert.equal(external.response.status, 201);
  await ui.tap("确认完成");
  await ui.waitFor("工单已变化或不满足确认条件");
  await ui.tap("取消");
  await ui.waitFor("已完成");
  assert.deepEqual(await status(stale.id), { status: "completed", count: 1 });
  console.log(
    JSON.stringify(
      {
        result: "passed",
        environment: "MuMu Android + Expo Go",
        checks: [
          "Result summary and cancel do not change state",
          "Lost response retries original UUID/version; one confirmation",
          "Success and cold restart read actual completion",
          "Stale modal conflicts and close refreshes actual record",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  android.capture("mobile-confirmations-failure.png", true);
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

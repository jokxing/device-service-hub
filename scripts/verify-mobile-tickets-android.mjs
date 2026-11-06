import assert from "node:assert/strict";
import { createNativeGateway } from "./lib/native-gateway.mjs";
import { randomUUID } from "node:crypto";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
const android = openLocalAndroid();
const ui = openAndroidUi(android);
const local = openLocalApi();
const db = await local.connectDatabase();
const title = "RN-" + randomUUID().slice(0, 8);
const attempts = [];

let ticket;
// A local gateway discards one successful upstream response and returns 502.
// Only the emulator is temporarily redirected; the API and Web keep their ports.
const proxy = createNativeGateway(({ path, method, input, status, value }) => {
  if (
    method !== "POST" ||
    path !== "/api/mobile/tickets" ||
    input?.title !== title
  )
    return;
  attempts.push(input);
  if (status === 201 && attempts.length === 1) {
    ticket = value;
    return "网关未收到提交结果，请重试相同内容";
  }
});
try {
  await local.waitForApi();
  await proxy.start();
  await ui.openLogin(3002);
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "AC-001");
  await ui.tap("查看设备详情");
  await ui.tap("发起文字报修");
  await ui.enter("问题标题", title);
  await ui.enter("问题描述", "Native-repair-verification");
  android.run(["shell", "input", "keyevent", "4"]);
  android.capture("mobile-android-repair.png");
  await ui.tap("提交报修");
  await ui.waitFor("网关未收到提交结果");
  assert.ok(ticket?.id);
  await ui.tap("提交报修");
  await ui.waitFor("报修详情");
  await ui.waitFor(title);
  assert.equal(attempts.length, 2);
  assert.equal(attempts[0].requestId, attempts[1].requestId);
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int AS count FROM "Ticket" WHERE "requestId"=$1',
        [attempts[0].requestId],
      )
    ).rows[0].count,
    1,
  );
  android.capture("mobile-android-ticket-detail.png");
  await ui.tap("返回我的报修");
  await ui.waitFor(title);
  android.capture("mobile-android-my-tickets.png");
  await ui.launch("tickets/" + ticket.id, 3002);
  await ui.waitFor(title);
  await ui.openLogin(3002);
  await ui.login("reporter.b", process.env.SEED_ACCOUNT_PASSWORD, "WP-002");
  await ui.tap("我的报修");
  await ui.waitFor("刷新报修");
  assert.equal(android.hierarchy().includes(title), false);
  await ui.launch("tickets/" + ticket.id, 3002);
  await ui.waitFor("报修记录不存在或无权访问");
  console.log(
    JSON.stringify(
      {
        result: "passed",
        environment: "MuMu Android + Expo Go",
        checks: [
          "Real native repair form and secure UUID",
          "Lost upstream result retries same intent and creates one ticket",
          "Own list/detail and cold restart persistence",
          "Account B cannot read account A ticket",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  android.capture("mobile-tickets-failure.png", true);
  throw error;
} finally {
  android.run(["reverse", "tcp:3001", "tcp:3001"]);
  if (attempts.length)
    await db.query('DELETE FROM "Ticket" WHERE "requestId"=ANY($1::uuid[])', [
      [...new Set(attempts.map((item) => item.requestId))],
    ]);
  for (const token of proxy.sessions)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await proxy.close();
  await db.end();
}

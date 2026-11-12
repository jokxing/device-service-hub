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
  f = quoteFixtures(local, db, "nq.accept.ui");
let v;
const attempts = [];
const gateway = createNativeGateway(({ path, method, input, status }) => {
  if (
    method === "POST" &&
    path === `/api/mobile/tickets/${v?.ticket.id}/quote/accept`
  ) {
    attempts.push(input);
    if (status === 201 && attempts.length === 1)
      return "报价确认响应丢失，请使用原意图重试";
  }
});
try {
  await local.waitForApi();
  const tech = await f.technician("原生报价确认界面维修员");
  v = await f.quotedTask(tech);
  await gateway.start();
  await ui.openLogin(3002);
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "我的设备");
  await ui.launch("tickets/" + v.ticket.id, 3002);
  await ui.waitFor(v.ticket.title);
  await ui.tap("确认报价");
  await ui.waitFor("确认维修报价");
  android.capture("mobile-quote-accept-dialog-android.png");
  await ui.tap("取消");
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "ServiceOrder" WHERE "ticketId"=$1',
        [v.ticket.id],
      )
    ).rows[0].n,
    0,
  );
  await ui.tap("确认报价");
  await ui.tap("确认报价并生成订单");
  await ui.waitFor("报价确认响应丢失");
  await ui.tap("确认报价并生成订单");
  await ui.reveal("服务订单");
  assert.equal(attempts.length, 2);
  assert.deepEqual(attempts[0], attempts[1]);
  const rows = (
    await db.query(
      'SELECT id,number,"totalCents" FROM "ServiceOrder" WHERE "ticketId"=$1',
      [v.ticket.id],
    )
  ).rows;
  assert.equal(rows.length, 1);
  assert.equal(rows[0].totalCents, v.quote.totalCents);
  const code = "SO-" + String(rows[0].number).padStart(6, "0");
  await ui.waitFor(code);
  android.capture("mobile-quote-order-android.png");
  await ui.launch("tickets/" + v.ticket.id, 3002);
  await ui.waitFor(v.ticket.title);
  await ui.reveal("服务订单");
  await ui.waitFor(code);
  assert.equal(android.hierarchy().includes('content-desc="确认报价"'), false);
  console.log(
    "Android reporter quote acceptance: exact revision/amount display, cancel no-write, lost response same intent retry, one order snapshot and cold reread passed.",
  );
} catch (error) {
  android.capture("mobile-quote-accept-failure.png", true);
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

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
  f = quoteFixtures(local, db, "nq.reject.ui"),
  gateway = createNativeGateway(() => {});
try {
  await local.waitForApi();
  const tech = await f.technician("拒绝报价界面维修员"),
    v = await f.quotedTask(tech);
  await gateway.start();
  await ui.openLogin(3002);
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "我的设备");
  await ui.launch("tickets/" + v.ticket.id, 3002);
  await ui.waitFor(v.ticket.title);
  await ui.tap("拒绝报价");
  await ui.tap("提交拒绝原因");
  await ui.waitFor("请填写有效的拒绝原因");
  await ui.enter("拒绝原因", "Budget-limit");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.pause();
  android.capture("mobile-quote-reject-dialog-android.png");
  await ui.tap("提交拒绝原因");
  await ui.reveal("拒绝原因：Budget-limit");
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "ServiceOrder" WHERE "ticketId"=$1',
        [v.ticket.id],
      )
    ).rows[0].n,
    0,
  );
  android.capture("mobile-quote-rejected-android.png");
  console.log(
    "Android quote rejection required reason, submit, normalized reason reread and no order passed.",
  );
} catch (e) {
  android.capture("mobile-quote-reject-failure.png", true);
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

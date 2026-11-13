import assert from "node:assert/strict";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "mock.hidden");
const { context, page, errors } = await openLocalBrowser("mock-hidden-profile");
try {
  await local.waitForApi();
  const { reporter } = await f.identities(),
    tech = await f.technician("历史测试隔离验证"),
    v = await f.orderedTask(tech);
  await context.addCookies([
    {
      name: "dsh_portal_session",
      value: decodeURIComponent(reporter.slice(reporter.indexOf("=") + 1)),
      url: "http://127.0.0.1:3000",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto("http://127.0.0.1:3000/orders/" + v.order.id, {
    waitUntil: "networkidle",
  });
  assert.equal(await page.getByRole("button", { name: /模拟/ }).count(), 0);
  assert.equal(await page.getByText("真实支付", { exact: true }).count(), 0);
  await page
    .getByRole("region", { name: "支付记录", exact: true })
    .getByText("测试环境", { exact: true })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Portal hides retired mock actions and retains payment test-environment identity.",
  );
} finally {
  await context.close();
  await f.cleanup();
  await db.end();
}

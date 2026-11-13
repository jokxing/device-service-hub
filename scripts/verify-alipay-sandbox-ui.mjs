import assert from "node:assert/strict";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "portal.alipay");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "alipay-sandbox-browser",
);
const origin = "http://127.0.0.1:3000";
let automaticQueries = 0;
page.on("request", (request) => {
  if (request.method() === "POST" && request.url().endsWith("/query"))
    automaticQueries++;
});
try {
  await local.waitForApi();
  const { reporter } = await fixtures.identities(),
    tech = await fixtures.technician("沙箱页面验证维修员"),
    v = await fixtures.orderedTask(tech);
  const token = decodeURIComponent(reporter.slice(reporter.indexOf("=") + 1));
  await context.addCookies([
    {
      name: "dsh_portal_session",
      value: token,
      url: origin,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const response = await page.goto(`${origin}/orders/${v.order.id}`, {
    waitUntil: "networkidle",
  });
  assert.equal(response.status(), 200);
  assert.ok(response.headers()["cache-control"].includes("no-store"));
  const section = page.getByRole("region", { name: "支付记录" });
  await section.getByRole("button", { name: /^支\s*付$/ }).click();
  await page.getByRole("dialog").waitFor();
  await page.screenshot({
    path: path.join(screenshots, "portal-alipay-sandbox-dialog.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(screenshots, "portal-alipay-sandbox-dialog-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  let cashierVisited = false;
  // Navigation is intercepted: this proves the portal's handoff, not actual cashier/payment acceptance.
  await page.route(
    "https://openapi-sandbox.dl.alipaydev.com/**",
    async (route) => {
      const url = new URL(route.request().url());
      assert.equal(url.searchParams.get("method"), "alipay.trade.page.pay");
      assert.equal(
        JSON.parse(url.searchParams.get("biz_content")).total_amount,
        "59.98",
      );
      cashierVisited = true;
      const returnUrl = new URL(url.searchParams.get("return_url"));
      assert.equal(returnUrl.origin, origin);
      assert.equal(returnUrl.pathname, "/payments/alipay-return");
      assert.equal(returnUrl.searchParams.get("orderId"), v.order.id);
      returnUrl.searchParams.set("trade_status", "TRADE_SUCCESS");
      await route.fulfill({
        status: 200,
        contentType: "text/html; charset=utf-8",
        body: `<html><body><a href="${returnUrl.href.replaceAll("&", "&amp;")}">返回门户</a></body></html>`,
      });
    },
  );
  await page.getByRole("button", { name: "前往收银台", exact: true }).click();
  await page.waitForURL("https://openapi-sandbox.dl.alipaydev.com/**");
  assert.ok(cashierVisited);
  await page.getByRole("link", { name: "返回门户" }).click();
  await page.waitForURL(`${origin}/orders/${v.order.id}?paymentReturn=alipay`);
  await page.getByText("支付结果确认中", { exact: true }).waitFor();
  await section.getByRole("heading", { name: "待核实", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "创建模拟支付单", exact: true })
      .count(),
    0,
  );
  await page.screenshot({
    path: path.join(screenshots, "portal-alipay-sandbox-pending-mobile.png"),
    fullPage: true,
  });
  const wrongOrigin = await context.request.post(
    `${origin}/api/orders/${v.order.id}/alipay-sandbox`,
    {
      headers: { Origin: "https://invalid.example" },
      data: { requestId: crypto.randomUUID() },
    },
  );
  assert.equal(wrongOrigin.status(), 403);
  const rows = await db.query(
    'SELECT "id" FROM "AlipaySandboxPayment" WHERE "orderId"=$1',
    [v.order.id],
  );
  assert.equal(rows.rowCount, 1);
  assert.equal(
    (
      await db.query('SELECT status FROM "AlipaySandboxPayment" WHERE id=$1', [
        rows.rows[0].id,
      ])
    ).rows[0].status,
    "pending",
  );
  const foreign = await local.login("reporter.b");
  await page
    .getByText("暂未收到最终支付结果", { exact: true })
    .waitFor({ timeout: 45000 });
  await page
    .getByRole("button", { name: "刷新支付记录", exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(
      screenshots,
      "portal-alipay-sandbox-return-timeout-mobile.png",
    ),
    fullPage: true,
  });
  await page.reload({ waitUntil: "networkidle" });
  // UI fixture only: simulates a delayed server update, not a channel payment/callback.
  await db.query('UPDATE "AlipaySandboxPayment" SET status=$1 WHERE id=$2', [
    "succeeded",
    rows.rows[0].id,
  ]);
  await page.getByText("支付成功", { exact: true }).waitFor({ timeout: 15000 });
  await section.getByRole("heading", { name: "已支付", exact: true }).waitFor();
  assert.equal(
    automaticQueries,
    0,
    "Return polling must never invoke financial commands",
  );
  await page.screenshot({
    path: path.join(
      screenshots,
      "portal-alipay-sandbox-return-success-mobile.png",
    ),
    fullPage: true,
  });
  await context.clearCookies();
  await context.addCookies([
    {
      name: "dsh_portal_session",
      value: decodeURIComponent(foreign.slice(foreign.indexOf("=") + 1)),
      url: origin,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const denied = await context.request.post(
    `${origin}/api/orders/${v.order.id}/alipay-sandbox/${rows.rows[0].id}/checkout`,
    { headers: { Origin: origin }, data: {} },
  );
  assert.equal(denied.status(), 404);
  assert.deepEqual(errors, []);
  console.log(
    "Portal sandbox UI: authenticated SSR, no-store, desktop/mobile dialog, signed handoff (intercepted), persisted pending record, mixed-mode suppression, Origin and owner isolation passed. No real sandbox payment performed.",
  );
} finally {
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

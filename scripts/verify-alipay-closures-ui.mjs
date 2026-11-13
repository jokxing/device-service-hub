import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "alipay.close.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "alipay-close-browser",
);
const origin = "http://127.0.0.1:3000";
try {
  await local.waitForApi();
  const { reporter } = await fixtures.identities(),
    tech = await fixtures.technician("关单界面验证维修员");
  const task = await fixtures.orderedTask(tech);
  const created = await local.request(
    `/orders/${task.order.id}/alipay-sandbox`,
    {
      cookie: reporter,
      method: "POST",
      body: { requestId: randomUUID() },
    },
  );
  assert.equal(created.response.status, 201);
  const payment = created.value.payment;
  await context.addCookies([
    {
      name: "dsh_portal_session",
      value: decodeURIComponent(reporter.slice(reporter.indexOf("=") + 1)),
      url: origin,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const url = `${origin}/orders/${task.order.id}`;
  await page.goto(url, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "关闭支付", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await page.screenshot({
    path: path.join(screenshots, "portal-alipay-close-mobile.png"),
    fullPage: false,
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  assert.equal(
    (
      await db.query('SELECT status FROM "AlipaySandboxPayment" WHERE id=$1', [
        payment.id,
      ])
    ).rows[0].status,
    "pending",
  );
  const route = `${origin}/api/orders/${task.order.id}/alipay-sandbox/${payment.id}/close`;
  const foreignOrigin = await context.request.post(route, {
    headers: { Origin: "https://invalid.example" },
    data: {},
  });
  assert.equal(foreignOrigin.status(), 403);
  // UI-only response fixtures. Actual channel outcome handling is verified separately.
  await page.route(route, (handler) =>
    handler.fulfill({
      status: 409,
      json: { message: "渠道尚未确认关闭，当前不能取消订单" },
    }),
  );
  await page.getByRole("button", { name: "关闭支付", exact: true }).click();
  await dialog
    .getByRole("button", { name: "确认关闭支付", exact: true })
    .click();
  await page
    .getByText("渠道尚未确认关闭，当前不能取消订单", { exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(screenshots, "portal-alipay-close-uncertain-mobile.png"),
    fullPage: false,
    animations: "disabled",
  });
  assert.equal(await dialog.count(), 0);
  await page.unroute(route);
  await page.route(route, async (handler) => {
    assert.equal(handler.request().method(), "POST");
    assert.deepEqual(handler.request().postDataJSON(), {});
    await db.query('UPDATE "AlipaySandboxPayment" SET status=$1 WHERE id=$2', [
      "closed",
      payment.id,
    ]);
    await handler.fulfill({
      status: 201,
      json: { ...payment, status: "closed" },
    });
  });
  await page.getByRole("button", { name: "重新尝试关闭", exact: true }).click();
  await dialog
    .getByRole("button", { name: "确认关闭支付", exact: true })
    .click();
  const history = page.locator("details").filter({ hasText: "历史支付记录" });
  await history.locator("summary").click();
  await history.getByRole("heading", { name: "已关闭", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: /^支\s*付$/ }).count(),
    1,
  );
  // A query must merge server data without replacing the browser document or collapsing history.
  let documentNavigations = 0;
  const onRequest = (request) => {
    if (request.isNavigationRequest() && request.frame() === page.mainFrame())
      documentNavigations++;
  };
  page.on("request", onRequest);
  await page.evaluate(() => {
    document.documentElement.dataset.paymentRefreshMarker = "retained";
  });
  const queryRoute = route.replace(/\/close$/, "/query");
  await page.route(queryRoute, (handler) =>
    handler.fulfill({ status: 201, json: { ...payment, status: "closed" } }),
  );
  const refreshed = page.waitForResponse(
    (response) =>
      response.request().headers()["rsc"] === "1" &&
      response.url().includes("/orders/"),
  );
  await history
    .getByRole("button", { name: "查询支付结果", exact: true })
    .click();
  await refreshed;
  await page.waitForFunction(
    () => document.querySelector("details")?.open === true,
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.dataset.paymentRefreshMarker,
    ),
    "retained",
  );
  assert.equal(documentNavigations, 0);
  page.off("request", onRequest);
  await page.unroute(queryRoute);
  await page.screenshot({
    path: path.join(screenshots, "portal-alipay-history-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  assert.equal(
    await page.getByRole("button", { name: "关闭支付", exact: true }).count(),
    0,
  );
  await page.getByRole("link", { name: /前往关联报修/ }).click();
  await page.getByRole("button", { name: "取消订单", exact: true }).click();
  await dialog
    .getByLabel("取消原因", { exact: true })
    .fill("支付已关闭，取消本次服务");
  await dialog
    .getByRole("button", { name: "确认取消订单", exact: true })
    .click();
  await page
    .getByText("订单已取消，关联工单已结束。以上保留原确认时的订单快照。", {
      exact: true,
    })
    .waitFor();
  assert.deepEqual(errors, []);
  console.log(
    "Alipay close UI: confirmation/cancel, 390px, wrong Origin, uncertain outcome, closed readback and original order cancellation passed. Close responses are UI fixtures, NOT actual Alipay closure.",
  );
} finally {
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "alipay.refund.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "alipay-refund-browser",
);
const require = createRequire(import.meta.url);
const {
  DatabaseService,
} = require("../apps/api/dist/database/database.service.js");
const {
  AlipaySandboxRefundsService,
} = require("../apps/api/dist/modules/payments/alipay/alipay-sandbox-refunds.service.js");
const database = new DatabaseService(),
  origin = "http://127.0.0.1:3000",
  web = "http://127.0.0.1:5173";
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities(),
    tech = await fixtures.technician("沙箱退款界面维修员"),
    task = await fixtures.orderedTask(tech);
  const created = await local.request(
    `/orders/${task.order.id}/alipay-sandbox`,
    { cookie: reporter, method: "POST", body: { requestId: randomUUID() } },
  );
  assert.equal(created.response.status, 201);
  const payment = created.value.payment,
    tradeNo = String(Date.now()) + "001";
  await db.query(
    'UPDATE "AlipaySandboxPayment" SET status=$1,"tradeNo"=$2 WHERE id=$3',
    ["succeeded", tradeNo, payment.id],
  );
  await context.addCookies([
    {
      name: "dsh_portal_session",
      value: decodeURIComponent(reporter.slice(reporter.indexOf("=") + 1)),
      url: origin,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto(`${origin}/orders/${task.order.id}`, {
    waitUntil: "networkidle",
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "申请退款", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await dialog.waitFor();
  await dialog
    .getByLabel("退款原因", { exact: true })
    .fill("维修计划调整，请退回沙箱款项");
  await dialog.screenshot({
    path: path.join(screenshots, "portal-alipay-refund-request-mobile.png"),
    animations: "disabled",
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth,
    ),
    false,
  );
  await dialog
    .getByRole("button", { name: "提交退款申请", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "退款申请待管理员处理", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "申请退款", exact: true }).count(),
    0,
  );
  const wrongOrigin = await context.request.post(
    `${origin}/api/orders/${task.order.id}/alipay-sandbox/${payment.id}/refund/query`,
    { headers: { Origin: "https://invalid.example" }, data: {} },
  );
  assert.equal(wrongOrigin.status(), 403);
  const cookieName = admin.slice(0, admin.indexOf("="));
  await context.addCookies([
    {
      name: cookieName,
      value: decodeURIComponent(admin.slice(admin.indexOf("=") + 1)),
      url: web,
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto(`${web}/service/orders/${task.order.id}`, {
    waitUntil: "networkidle",
  });
  await page.getByText("退款申请待处理", { exact: true }).waitFor();
  await page.getByRole("button", { name: "执行退款", exact: true }).click();
  await page.evaluate(async () => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await Promise.all(
      document
        .getAnimations()
        .filter((animation) =>
          Number.isFinite(animation.effect?.getComputedTiming().endTime),
        )
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  await dialog.screenshot({
    path: path.join(screenshots, "admin-alipay-refund-confirm-mobile.png"),
    animations: "disabled",
  });
  const adminRow = (
    await db.query('SELECT id,username,name FROM "User" WHERE username=$1', [
      "admin",
    ])
  ).rows[0];
  const service = new AlipaySandboxRefundsService(database, {
    refund: async () => ({
      code: "10000",
      out_trade_no: payment.id,
      trade_no: tradeNo,
      refund_fee: "59.98",
      fund_change: "Y",
    }),
  });
  // Route fixture invokes the real use-case/transaction, not a real Alipay refund.
  await page.route(
    `${web}/api/orders/${task.order.id}/alipay-sandbox/${payment.id}/refund/submit`,
    async (handler) => {
      const result = await service.submit(
        { ...adminRow, role: "admin" },
        task.order.id,
        payment.id,
      );
      await handler.fulfill({ status: 201, json: result });
    },
  );
  await dialog.getByRole("button", { name: "确认退款", exact: true }).click();
  await page.getByText("退款成功", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "执行退款", exact: true }).count(),
    0,
  );
  await page.goto(`${origin}/orders/${task.order.id}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("heading", { name: "退款成功", exact: true }).waitFor();
  await page
    .getByText("全额支付宝沙箱退款成功，结束未开工服务", { exact: false })
    .waitFor();
  await page.screenshot({
    path: path.join(screenshots, "portal-alipay-refund-success-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  assert.deepEqual(errors, []);
  console.log(
    "Sandbox refund UI: owner application/shared form, Origin guard, admin confirmation, real transaction via injected channel response, cancelled order and owner refund readback passed. NOT an actual Alipay refund.",
  );
} finally {
  await context.close();
  await fixtures.cleanup();
  await database.$disconnect();
  await db.end();
}

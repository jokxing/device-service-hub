import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "order.start.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "order-starts-profile",
);
const web = "http://127.0.0.1:5173",
  portal = "http://127.0.0.1:3000";
const bodies = [];
let release, notify;
const gate = new Promise((r) => (release = r)),
  started = new Promise((r) => (notify = r));
const dialog = page.getByRole("dialog", { name: "确认订单开工", exact: true });
const submit = () =>
  dialog.getByRole("button", { name: "确认开工", exact: true });
async function auth(cookie) {
  await context.clearCookies();
  await context.addCookies([
    {
      name: "dsh_session",
      value: cookie.split(";")[0].slice("dsh_session=".length),
      domain: "127.0.0.1",
      path: "/api",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
}
const visit = (v) =>
  page.goto(`${web}/service/tasks/${v.ticket.id}`, {
    waitUntil: "networkidle",
  });
const command = (v) => ({
  requestId: randomUUID(),
  expectedVersion: v.ticket.version,
});
const cancel = (reporter, v) =>
  local.request(`/orders/${v.order.id}/cancel`, {
    cookie: reporter,
    method: "POST",
    body: { ...command(v), reason: "另一窗口取消" },
  });
async function shot(name) {
  await page.evaluate(async () => {
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    await Promise.all(
      document.getAnimations().map((a) => a.finished.catch(() => {})),
    );
  });
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(screenshots, name),
    fullPage: !(await dialog.count()),
    animations: "disabled",
    style: "nextjs-portal { visibility: hidden !important; }",
  });
}
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities();
  const tech = await fixtures.technician("开工页面验收维修员");
  const a = await fixtures.orderedTask(tech, { title: "空调接线检修开工" }),
    stale = await fixtures.orderedTask(tech),
    closed = await fixtures.orderedTask(tech),
    expired = await fixtures.orderedTask(tech);
  await auth(tech.cookie);
  for (const headers of [{}, { Origin: "https://untrusted.invalid" }]) {
    const response = await context.request.post(
      web + "/api/orders/" + a.order.id + "/start",
      { headers, data: command(a) },
    );
    assert.equal(response.status(), 403);
  }
  await visit(a);
  await page.getByRole("button", { name: "订单开工", exact: true }).click();
  await dialog.waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("order-start-dialog-mobile.png");
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "订单开工", exact: true }).waitFor();
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS n FROM "ServiceOrderStart" WHERE "orderId"=$1',
        [a.order.id],
      )
    ).rows[0].n,
    0,
  );
  await page.getByRole("button", { name: "订单开工", exact: true }).click();
  let first = true;
  await page.route(`**/api/orders/${a.order.id}/start`, async (route) => {
    bodies.push(route.request().postDataJSON());
    if (first) {
      first = false;
      const r = await route.fetch();
      assert.equal(r.status(), 201);
      notify();
      await gate;
      await r.dispose();
      return route.abort("failed");
    }
    return route.continue();
  });
  await submit().click();
  await started;
  assert.ok(await submit().isDisabled());
  assert.ok(
    await dialog.getByRole("button", { name: /^取\s*消$/ }).isDisabled(),
  );
  await page.keyboard.press("Escape");
  assert.ok(await dialog.isVisible());
  release();
  await dialog.getByText(/尚未确认开工结果/).waitFor();
  await submit().click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByLabel("订单开工记录")
    .getByText("开工人：" + tech.name, { exact: true })
    .waitFor();
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(bodies[0].expectedVersion, 4);
  assert.equal(
    await page.getByRole("button", { name: "订单开工", exact: true }).count(),
    0,
  );
  assert.equal(
    await page
      .getByRole("button", { name: "提交处理结果", exact: true })
      .count(),
    1,
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("订单开工记录").waitFor();
  await shot("order-started-task-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot("order-started-task-desktop.png");
  await visit(stale);
  await page.getByRole("button", { name: "订单开工", exact: true }).click();
  assert.equal((await cancel(reporter, stale)).response.status, 201);
  await submit().click();
  await dialog.getByText(/订单或工单已变化/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByLabel("订单取消记录").waitFor();
  assert.equal(
    await page.getByRole("button", { name: "订单开工", exact: true }).count(),
    0,
  );
  await visit(closed);
  await page.getByRole("button", { name: "订单开工", exact: true }).click();
  await page.route(`**/api/orders/${closed.order.id}/start`, async (route) => {
    const r = await route.fetch();
    assert.equal(r.status(), 201);
    await r.dispose();
    await route.abort("failed");
  });
  await submit().click();
  await dialog.getByText(/尚未确认开工结果/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByLabel("订单开工记录").waitFor();
  await visit(expired);
  await page.getByRole("button", { name: "订单开工", exact: true }).click();
  const token = tech.cookie.split(";")[0].slice("dsh_session=".length);
  const update = await db.query(
    'UPDATE "Session" SET "expiresAt"=$1 WHERE "tokenHash"=$2',
    [new Date(0), createHash("sha256").update(token).digest("hex")],
  );
  assert.equal(update.rowCount, 1);
  await submit().click();
  await page.waitForURL("**/login");
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS n FROM "ServiceOrderStart" WHERE "orderId"=$1',
        [expired.order.id],
      )
    ).rows[0].n,
    0,
  );
  await auth(admin);
  await page.goto(web + "/service/admin/tickets?status=processing", {
    waitUntil: "networkidle",
  });
  await page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: "空调接线检修开工" })
    .getByRole("button", { name: "详情", exact: true })
    .click();
  await page.getByLabel("订单开工记录").waitFor();
  assert.equal(
    await page.getByRole("button", { name: "订单开工", exact: true }).count(),
    0,
  );
  await page.getByLabel("订单开工记录").scrollIntoViewIfNeeded();
  await shot("order-started-admin.png");
  await context.clearCookies();
  await page.goto(portal + "/login", { waitUntil: "networkidle" });
  await page
    .getByRole("textbox", { name: "账号", exact: true })
    .fill("reporter.a");
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL(portal + "/devices");
  await page.goto(`${portal}/tickets/${a.ticket.id}`, {
    waitUntil: "networkidle",
  });
  const order = page.getByLabel("服务订单", { exact: true });
  await order.getByText("维修中", { exact: true }).waitFor();
  await order.getByText(tech.name, { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "取消订单", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "订单开工", exact: true }).count(),
    0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("portal-order-started-mobile.png");
  assert.deepEqual(errors, []);
  console.log(
    "Order starts UI: 390px layout, cancel without write, exact lost-response retry, submit protection, close/reread, stale cancellation, expiry, technician/admin/portal records and no user cancellation after start passed.",
  );
} catch (error) {
  await page
    .screenshot({
      path: path.join(local.root, ".local/order-starts-ui-failure.png"),
      fullPage: true,
    })
    .catch(() => {});
  throw error;
} finally {
  release();
  for (const cookie of await context.cookies(portal))
    if (cookie.name === "dsh_portal_session")
      await local.logout("dsh_session=" + cookie.value).catch(() => {});
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

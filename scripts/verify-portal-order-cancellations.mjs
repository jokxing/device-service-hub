import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "portal.cancel");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "portal-order-cancellations-profile",
);
const origin = "http://127.0.0.1:3000",
  webOrigin = "http://127.0.0.1:5173",
  tokens = new Set(),
  bodies = [];
let release, notify;
const gate = new Promise((r) => (release = r)),
  started = new Promise((r) => (notify = r));
async function login(username) {
  await page.goto(origin + "/login", { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL(origin + "/devices");
  const cookie = (await context.cookies(origin)).find(
    (c) => c.name === "dsh_portal_session",
  );
  assert.ok(cookie?.httpOnly);
  tokens.add(cookie.value);
  return cookie;
}
const visit = (v) =>
  page.goto(`${origin}/tickets/${v.ticket.id}`, { waitUntil: "networkidle" });
const dialog = page.getByRole("dialog");
const submit = () =>
  dialog.getByRole("button", { name: "确认取消订单", exact: true });
async function open() {
  await page.getByRole("button", { name: "取消订单", exact: true }).click();
  await dialog.waitFor();
}
async function post(v, body, status, headers = { Origin: origin }) {
  const r = await context.request.post(
    `${origin}/api/orders/${v.order.id}/cancel`,
    { headers, data: body },
  );
  assert.equal(r.status(), status, await r.text());
}
async function shot(target, name, reveal) {
  const modal = target.getByRole("dialog");
  if (await modal.count()) {
    await modal.evaluate(async (el) => {
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      await Promise.all(
        el
          .getAnimations({ subtree: true })
          .map((a) => a.finished.catch(() => {})),
      );
    });
    const b = await modal.boundingBox();
    assert.ok(b && b.y >= 0 && b.y + b.height <= target.viewportSize().height);
  }
  if (reveal) await reveal.scrollIntoViewIfNeeded();
  assert.ok(
    await target.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await target.screenshot({
    path: path.join(screenshots, name),
    fullPage: !(await modal.count()),
    animations: "disabled",
    style: "nextjs-portal { visibility: hidden !important; }",
  });
}
try {
  await local.waitForApi();
  await context.clearCookies();
  const tech = await fixtures.technician("订单取消页面验收维修员");
  const a = await fixtures.orderedTask(tech, { title: "取消待开工维修服务" }),
    stale = await fixtures.orderedTask(tech),
    closed = await fixtures.orderedTask(tech),
    changed = await fixtures.orderedTask(tech),
    expired = await fixtures.orderedTask(tech);
  const cookie = await login("reporter.a"),
    command = (v) => ({
      requestId: randomUUID(),
      expectedVersion: v.ticket.version,
      reason: "取消原因",
    });
  await post(a, command(a), 403, {});
  await post(a, command(a), 403, { Origin: "https://untrusted.invalid" });
  await post(a, { ...command(a), actorId: "user-admin" }, 400);
  await visit(a);
  await open();
  await submit().click();
  await dialog.getByText("请填写取消原因", { exact: true }).waitFor();
  await dialog
    .getByLabel("取消原因", { exact: true })
    .fill("设备已更换\n不再继续本次维修");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "portal-order-cancel-dialog-mobile.png");
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "取消订单", exact: true }).waitFor();
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS n FROM "ServiceOrderCancellation" WHERE "orderId"=$1',
        [a.order.id],
      )
    ).rows[0].n,
    0,
  );
  await open();
  assert.equal(
    await dialog.getByLabel("取消原因", { exact: true }).inputValue(),
    "",
  );
  await dialog
    .getByLabel("取消原因", { exact: true })
    .fill("  设备已更换\n不再继续本次维修  ");
  let first = true;
  await page.route(`**/api/orders/${a.order.id}/cancel`, async (route) => {
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
  await page.mouse.click(2, 2);
  assert.equal(await dialog.count(), 1);
  release();
  await dialog.getByText(/尚未确认取消结果/).waitFor();
  await submit().click();
  await dialog.waitFor({ state: "hidden" });
  const order = () =>
    page.getByRole("article", { name: "服务订单", exact: true });
  await order().getByText("已取消", { exact: true }).waitFor();
  await order()
    .getByLabel("订单取消记录")
    .getByText(/设备已更换/)
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: /^(取消订单|确认报价|拒绝报价|确认完成)$/ })
      .count(),
    0,
  );
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].expectedVersion, 4);
  assert.equal(bodies[0].reason, "设备已更换\n不再继续本次维修");
  await order()
    .getByText("订单金额：¥59.98（人民币）", { exact: true })
    .waitFor();
  await page.getByText("工单已取消", { exact: true }).waitFor();
  await shot(page, "portal-order-cancelled-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot(page, "portal-order-cancelled-desktop.png");
  await page.reload({ waitUntil: "networkidle" });
  await order().getByText("已取消", { exact: true }).waitFor();
  const { admin, reporter } = await fixtures.identities();
  await context.addCookies([
    {
      name: "dsh_session",
      value: admin.slice(admin.indexOf("=") + 1),
      domain: "127.0.0.1",
      path: "/api",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const web = await context.newPage();
  web.on("pageerror", (e) => errors.push(e.message));
  await web.goto(webOrigin + "/service/admin/tickets?status=cancelled", {
    waitUntil: "networkidle",
  });
  await web
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: a.ticket.code })
    .getByRole("button", { name: "详情", exact: true })
    .click();
  const summary = web.getByLabel("服务订单", { exact: true });
  await summary.getByText("已取消", { exact: true }).waitFor();
  await summary
    .getByLabel("订单取消记录")
    .getByText(/设备已更换/)
    .waitFor();
  assert.equal(
    await web.getByRole("button", { name: "取消订单", exact: true }).count(),
    0,
  );
  await shot(
    web,
    "service-order-cancelled.png",
    summary.getByLabel("订单取消记录"),
  );
  await web.close();
  await context.addCookies([
    {
      name: "dsh_session",
      value: tech.cookie.slice(tech.cookie.indexOf("=") + 1),
      domain: "127.0.0.1",
      path: "/api",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const task = await context.newPage();
  task.on("pageerror", (e) => errors.push(e.message));
  await task.goto(`${webOrigin}/service/tasks/${a.ticket.id}`, {
    waitUntil: "networkidle",
  });
  await task
    .getByLabel("服务订单", { exact: true })
    .getByLabel("订单取消记录")
    .getByText(/设备已更换/)
    .waitFor();
  assert.equal(
    await task
      .getByRole("button", { name: /^(接单|提交处理结果|重新报价|取消订单)$/ })
      .count(),
    0,
  );
  await task.close();

  await visit(stale);
  await open();
  await dialog.getByLabel("取消原因", { exact: true }).fill("旧窗口原因");
  assert.equal(
    (
      await local.request(`/orders/${stale.order.id}/cancel`, {
        cookie: reporter,
        method: "POST",
        body: { ...command(stale), reason: "另一窗口已取消" },
      })
    ).response.status,
    201,
  );
  await submit().click();
  await dialog.getByText(/订单或工单已变化/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await order()
    .getByText("取消原因：另一窗口已取消", { exact: true })
    .waitFor();
  await visit(closed);
  await open();
  await dialog.getByLabel("取消原因", { exact: true }).fill("关闭后核对结果");
  await page.route(`**/api/orders/${closed.order.id}/cancel`, async (route) => {
    const r = await route.fetch();
    assert.equal(r.status(), 201);
    await r.dispose();
    await route.abort("failed");
  });
  await submit().click();
  await dialog.getByText(/尚未确认取消结果/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await order().getByText("已取消", { exact: true }).waitFor();
  await visit(changed);
  await open();
  await dialog.getByLabel("取消原因", { exact: true }).fill("原原因");
  const attempts = [];
  await page.route(`**/api/orders/${changed.order.id}/cancel`, (route) => {
    attempts.push(route.request().postDataJSON());
    return attempts.length === 1
      ? route.fulfill({ status: 502, json: { message: "尚未确认取消结果" } })
      : route.continue();
  });
  await submit().click();
  await dialog.getByText("尚未确认取消结果", { exact: true }).waitFor();
  await dialog.getByLabel("取消原因", { exact: true }).fill("调整后的原因");
  await submit().click();
  await dialog.waitFor({ state: "hidden" });
  assert.notEqual(attempts[0].requestId, attempts[1].requestId);
  assert.equal(attempts[1].expectedVersion, 4);
  await visit(expired);
  await open();
  await dialog.getByLabel("取消原因", { exact: true }).fill("过期会话不可取消");
  const update = await db.query(
    'UPDATE "Session" SET "expiresAt"=$1 WHERE "tokenHash"=$2',
    [new Date(0), createHash("sha256").update(cookie.value).digest("hex")],
  );
  assert.equal(update.rowCount, 1);
  await submit().click();
  await page.waitForURL(origin + "/login");
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS n FROM "ServiceOrderCancellation" WHERE "orderId"=$1',
        [expired.order.id],
      )
    ).rows[0].n,
    0,
  );
  await login("reporter.b");
  await visit(a);
  await page.getByRole("heading", { name: "未找到可访问的页面" }).waitFor();
  await post(a, command(a), 404);
  assert.deepEqual(errors, []);
  console.log(
    "Portal order cancellations: cause validation/cancel reset, exact lost-response replay, in-flight protection, cancelled ticket/order SSR/snapshot, admin/current-technician read-only records, stale window, changed-reason intent, close/reread, expiry and cross-user isolation passed.",
  );
} catch (error) {
  await page
    .screenshot({
      path: path.join(local.root, ".local/portal-order-cancel-failure.png"),
      fullPage: true,
    })
    .catch(() => {});
  throw error;
} finally {
  release();
  await context.close();
  for (const token of tokens)
    await local.logout("dsh_session=" + token).catch(() => {});
  await fixtures.cleanup();
  await db.end();
}

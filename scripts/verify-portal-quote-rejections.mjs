import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "portal.reject");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "portal-rejections-browser-profile",
);
const origin = "http://127.0.0.1:3000",
  tokens = new Set(),
  bodies = [];
let release;
const gate = new Promise((resolve) => {
  release = resolve;
});
let notify;
const started = new Promise((resolve) => {
  notify = resolve;
});
const command = (value) => ({
  requestId: randomUUID(),
  expectedVersion: value.ticket.version,
  quoteId: value.quote.id,
  quoteRevision: value.quote.revision,
});
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
const visit = (value) =>
  page.goto(origin + "/tickets/" + value.ticket.id, {
    waitUntil: "networkidle",
  });
const dialog = page.getByRole("dialog");
const submit = () =>
  dialog.getByRole("button", { name: "确认拒绝报价", exact: true });
async function open() {
  await page.getByRole("button", { name: "拒绝报价", exact: true }).click();
  await dialog.waitFor();
}
async function shot(name) {
  if (await dialog.count()) {
    await dialog.evaluate(async (el) => {
      await new Promise((r) =>
        requestAnimationFrame(() => requestAnimationFrame(r)),
      );
      await Promise.all(
        el
          .getAnimations({ subtree: true })
          .map((a) => a.finished.catch(() => {})),
      );
    });
    const bounds = await dialog.boundingBox();
    assert.ok(
      bounds &&
        bounds.y >= 0 &&
        bounds.y + bounds.height <= page.viewportSize().height,
    );
  }
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
async function post(value, input, status, headers = { Origin: origin }) {
  const response = await context.request.post(
    `${origin}/api/tickets/${value.ticket.id}/quote/reject`,
    { headers, data: input },
  );
  assert.equal(response.status(), status, await response.text());
}
try {
  await local.waitForApi();
  await context.clearCookies();
  const tech = await fixtures.technician("门户拒绝报价验收维修员");
  const a = await fixtures.quotedTask(tech, { title: "现场维修方案报价" });
  const stale = await fixtures.quotedTask(tech),
    closed = await fixtures.quotedTask(tech),
    changed = await fixtures.quotedTask(tech),
    expired = await fixtures.quotedTask(tech);
  const cookie = await login("reporter.a");
  await post(a, { ...command(a), reason: "原因" }, 403, {});
  await post(a, { ...command(a), reason: "原因" }, 403, {
    Origin: "https://untrusted.invalid",
  });
  await post(a, { ...command(a), reason: "原因", actorId: "user-admin" }, 400);
  await post(a, { ...command(a), reason: "  " }, 400);
  await visit(a);
  await open();
  await submit().click();
  await dialog.getByText("请填写拒绝原因", { exact: true }).waitFor();
  await dialog
    .getByLabel("拒绝原因", { exact: true })
    .fill("预算超出预期\n请调整配件方案");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("portal-quote-reject-dialog-mobile.png");
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "拒绝报价", exact: true }).waitFor();
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS n FROM "QuoteRejection" WHERE "quoteId"=$1',
        [a.quote.id],
      )
    ).rows[0].n,
    0,
  );
  await open();
  assert.equal(
    await dialog.getByLabel("拒绝原因", { exact: true }).inputValue(),
    "",
  );
  await dialog
    .getByLabel("拒绝原因", { exact: true })
    .fill("  预算超出预期\n请调整配件方案  ");
  let first = true;
  await page.route(
    `**/api/tickets/${a.ticket.id}/quote/reject`,
    async (route) => {
      bodies.push(route.request().postDataJSON());
      if (first) {
        first = false;
        const response = await route.fetch();
        assert.equal(response.status(), 201);
        notify();
        await gate;
        await response.dispose();
        return route.abort("failed");
      }
      return route.continue();
    },
  );
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
  await dialog.getByText(/尚未确认拒绝结果/).waitFor();
  await submit().click();
  await dialog.waitFor({ state: "hidden" });
  const panel = page.getByRole("article", { name: "维修报价", exact: true });
  await panel.getByText("已拒绝", { exact: true }).waitFor();
  await panel
    .getByLabel("报价拒绝记录")
    .getByText(/预算超出预期/)
    .waitFor();
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].reason, "预算超出预期\n请调整配件方案");
  assert.equal(bodies[0].expectedVersion, 3);
  assert.equal(bodies[0].quoteId, a.quote.id);
  assert.equal(bodies[0].quoteRevision, 1);
  assert.equal(
    await page.getByRole("article", { name: "服务订单", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: /^(确认报价|拒绝报价)$/ }).count(),
    0,
  );
  await shot("portal-quote-rejected-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot("portal-quote-rejected-desktop.png");
  await page.reload({ waitUntil: "networkidle" });
  await panel.getByText("已拒绝", { exact: true }).waitFor();
  const { reporter, admin } = await fixtures.identities();
  await context.addCookies([
    {
      name: "dsh_session",
      value: admin.slice(admin.indexOf("=") + 1),
      url: "http://127.0.0.1:5173",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  const web = await context.newPage();
  web.on("pageerror", (e) => errors.push(e.message));
  await web.goto(
    "http://127.0.0.1:5173/service/admin/tickets?status=processing",
    { waitUntil: "networkidle" },
  );
  await web
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: a.ticket.code })
    .getByRole("button", { name: "详情", exact: true })
    .click();
  const summary = web.getByLabel("报价明细", { exact: true });
  await summary.getByText("已拒绝", { exact: true }).waitFor();
  await summary
    .getByLabel("报价拒绝记录")
    .getByText(/预算超出预期/)
    .waitFor();
  await summary.getByLabel("报价拒绝记录").scrollIntoViewIfNeeded();
  await web.screenshot({
    path: path.join(screenshots, "service-quote-rejected.png"),
    animations: "disabled",
  });
  await web.close();

  await visit(stale);
  await open();
  await dialog.getByLabel("拒绝原因", { exact: true }).fill("拒绝过期报价");
  assert.equal(
    (
      await local.request(`/tickets/${stale.ticket.id}/quote/accept`, {
        cookie: reporter,
        method: "POST",
        body: command(stale),
      })
    ).response.status,
    201,
  );
  await submit().click();
  await dialog.getByText(/报价决定已变化/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.getByRole("article", { name: "服务订单", exact: true }).waitFor();

  await visit(closed);
  await open();
  await dialog.getByLabel("拒绝原因", { exact: true }).fill("需要调整方案");
  await page.route(
    `**/api/tickets/${closed.ticket.id}/quote/reject`,
    async (route) => {
      const r = await route.fetch();
      assert.equal(r.status(), 201);
      await r.dispose();
      await route.abort("failed");
    },
  );
  await submit().click();
  await dialog.getByText(/尚未确认拒绝结果/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await panel.getByText("已拒绝", { exact: true }).waitFor();

  await visit(changed);
  await open();
  await dialog.getByLabel("拒绝原因", { exact: true }).fill("原原因");
  const changedBodies = [];
  await page.route(
    `**/api/tickets/${changed.ticket.id}/quote/reject`,
    (route) => {
      changedBodies.push(route.request().postDataJSON());
      return changedBodies.length === 1
        ? route.fulfill({ status: 502, json: { message: "尚未确认拒绝结果" } })
        : route.continue();
    },
  );
  await submit().click();
  await dialog.getByText("尚未确认拒绝结果", { exact: true }).waitFor();
  await dialog.getByLabel("拒绝原因", { exact: true }).fill("修改后的原因");
  await submit().click();
  await dialog.waitFor({ state: "hidden" });
  assert.notEqual(changedBodies[0].requestId, changedBodies[1].requestId);
  assert.equal(changedBodies[1].expectedVersion, 3);
  await visit(expired);
  await open();
  await dialog.getByLabel("拒绝原因", { exact: true }).fill("会话过期不可拒绝");
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
        'SELECT COUNT(*)::int AS n FROM "QuoteRejection" WHERE "quoteId"=$1',
        [expired.quote.id],
      )
    ).rows[0].n,
    0,
  );
  await login("reporter.b");
  await visit(a);
  await page.getByRole("heading", { name: "未找到可访问的页面" }).waitFor();
  await post(a, { ...command(a), reason: "越权拒绝" }, 404);
  assert.deepEqual(errors, []);
  console.log(
    "Portal quote rejections: validation/cancel reset, exact normalized intent/lost-response replay, in-flight protection, SSR audit/no order, admin view, stale decision, changed-reason UUID, close/reread, expiry and cross-user isolation passed.",
  );
} catch (error) {
  await page
    .screenshot({
      path: path.join(local.root, ".local/portal-rejection-failure.png"),
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

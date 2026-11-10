import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "mockpay.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "mock-payments-profile",
);
const portal = "http://127.0.0.1:3000",
  web = "http://127.0.0.1:5173",
  tokens = new Set(),
  bodies = [];
let release, notify;
const gate = new Promise((r) => (release = r)),
  started = new Promise((r) => (notify = r));
const dialog = page.getByRole("dialog", {
  name: "创建模拟支付单",
  exact: true,
});
const submit = () =>
  dialog.getByRole("button", { name: "确认创建模拟支付单", exact: true });
const visit = (v) =>
  page.goto(`${portal}/orders/${v.order.id}`, { waitUntil: "networkidle" });
async function open() {
  await page
    .getByRole("button", { name: "创建模拟支付单", exact: true })
    .click();
  await dialog.waitFor();
}
async function login(username) {
  await context.clearCookies();
  await page.goto(portal + "/login", { waitUntil: "networkidle" });
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL(portal + "/devices");
  const cookie = (await context.cookies(portal)).find(
    (c) => c.name === "dsh_portal_session",
  );
  tokens.add(cookie.value);
  return cookie;
}
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
async function shot(name, reveal) {
  await page.evaluate(async () => {
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
        .map((a) => a.finished.catch(() => {})),
    );
  });
  if (reveal) await reveal.scrollIntoViewIfNeeded();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  if (await dialog.count()) {
    const box = await dialog.boundingBox();
    assert.ok(
      box && box.y >= 0 && box.y + box.height <= page.viewportSize().height,
    );
  }
  await page.screenshot({
    path: path.join(screenshots, name),
    fullPage: !(await dialog.count()),
    animations: "disabled",
    style: "nextjs-portal{visibility:hidden!important}",
  });
}
const create = (cookie, v) =>
  local.request(`/orders/${v.order.id}/payments`, {
    cookie,
    method: "POST",
    body: { requestId: randomUUID() },
  });
try {
  await local.waitForApi();
  const { admin, reporter } = await fixtures.identities(),
    tech = await fixtures.technician("模拟支付界面维修员");
  const a = await fixtures.orderedTask(tech, {
      title: "模拟支付单创建与取消联动",
    }),
    stale = await fixtures.orderedTask(tech),
    closed = await fixtures.orderedTask(tech),
    expired = await fixtures.orderedTask(tech);
  const cookie = await login("reporter.a");
  for (const headers of [{}, { Origin: "https://untrusted.invalid" }]) {
    const r = await context.request.post(
      `${portal}/api/orders/${a.order.id}/payments`,
      { headers, data: { requestId: randomUUID() } },
    );
    assert.equal(r.status(), 403);
  }
  const forged = await context.request.post(
    `${portal}/api/orders/${a.order.id}/payments`,
    {
      headers: { Origin: portal },
      data: { requestId: randomUUID(), amountCents: 1 },
    },
  );
  assert.equal(forged.status(), 400);
  const initial = await visit(a);
  assert.ok(initial.headers()["cache-control"]?.includes("no-store"));
  assert.ok(!(await initial.text()).includes(cookie.value));
  await open();
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("mock-payment-dialog-mobile.png");
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByRole("button", { name: "创建模拟支付单", exact: true })
    .waitFor();
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS n FROM "PaymentAttempt" WHERE "orderId"=$1',
        [a.order.id],
      )
    ).rows[0].n,
    0,
  );
  await open();
  let first = true;
  await page.route(`**/api/orders/${a.order.id}/payments`, async (route) => {
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
  await dialog.getByText(/尚未确认模拟支付单创建结果/).waitFor();
  await submit().click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByLabel("模拟支付记录")
    .getByText("待支付（模拟）", { exact: true })
    .waitFor();
  assert.deepEqual(bodies[0], bodies[1]);
  assert.deepEqual(Object.keys(bodies[0]), ["requestId"]);
  assert.equal(
    await page
      .getByRole("button", { name: "创建模拟支付单", exact: true })
      .count(),
    0,
  );
  await shot("mock-payment-pending-mobile.png");
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByLabel("模拟支付记录")
    .getByText("待支付（模拟）", { exact: true })
    .waitFor();
  await visit(stale);
  await open();
  assert.equal((await create(reporter, stale)).response.status, 201);
  await submit().click();
  await dialog.getByText(/已有待支付的模拟支付单/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByLabel("模拟支付记录")
    .getByText("待支付（模拟）", { exact: true })
    .waitFor();
  await visit(closed);
  await open();
  await page.route(
    `**/api/orders/${closed.order.id}/payments`,
    async (route) => {
      const r = await route.fetch();
      assert.equal(r.status(), 201);
      await r.dispose();
      await route.abort("failed");
    },
  );
  await submit().click();
  await dialog.getByText(/尚未确认模拟支付单创建结果/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByLabel("模拟支付记录")
    .getByText("待支付（模拟）", { exact: true })
    .waitFor();
  const cancelled = await local.request(`/orders/${a.order.id}/cancel`, {
    cookie: reporter,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: 4,
      reason: "关闭模拟支付记录",
    },
  });
  assert.equal(cancelled.response.status, 201);
  await visit(a);
  await page
    .getByLabel("模拟支付记录")
    .getByText("已关闭（模拟）", { exact: true })
    .waitFor();
  await shot("mock-payment-closed-mobile.png");
  await visit(expired);
  await open();
  const update = await db.query(
    'UPDATE "Session" SET "expiresAt"=$1 WHERE "tokenHash"=$2',
    [new Date(0), createHash("sha256").update(cookie.value).digest("hex")],
  );
  assert.equal(update.rowCount, 1);
  await submit().click();
  await page.waitForURL(portal + "/login");
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS n FROM "PaymentAttempt" WHERE "orderId"=$1',
        [expired.order.id],
      )
    ).rows[0].n,
    0,
  );
  await login("reporter.b");
  await visit(a);
  await page
    .getByRole("heading", { name: "未找到可访问的页面", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await auth(admin);
  await page.goto(`${web}/service/orders/${a.order.id}`, {
    waitUntil: "networkidle",
  });
  await page
    .getByLabel("模拟支付记录")
    .getByText("已关闭（模拟）", { exact: true })
    .waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "创建模拟支付单", exact: true })
      .count(),
    0,
  );
  await shot(
    "mock-payment-admin-readonly.png",
    page.getByLabel("模拟支付记录"),
  );
  await auth(tech.cookie);
  await page.goto(`${web}/service/orders/${a.order.id}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("heading", { name: "订单详情", exact: true }).waitFor();
  assert.equal(await page.getByLabel("模拟支付记录").count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Mock payments UI: local-only labels, owner creation, no-write cancel, exact lost-response retry, busy protection, stale-window conflict, close/reread, pending/closed SSR, expiry and cross-user isolation, admin read-only and technician record exclusion passed.",
  );
} catch (error) {
  await page
    .screenshot({
      path: path.join(local.root, ".local/mock-payments-ui-failure.png"),
      fullPage: true,
    })
    .catch(() => {});
  throw error;
} finally {
  release();
  for (const token of tokens)
    await local.logout("dsh_session=" + token).catch(() => {});
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

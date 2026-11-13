import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "portal.quote");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "portal-quotes-browser-profile",
);
const origin = "http://127.0.0.1:3000";
page.on("console", (message) => {
  if (/\[antd: Modal\].*maskClosable.*deprecated/.test(message.text())) {
    errors.push(message.text());
  }
});
const tokens = new Set();
const bodies = [];
let release;
const gate = new Promise((resolve) => {
  release = resolve;
});
let notify;
const started = new Promise((resolve) => {
  notify = resolve;
});
async function remember() {
  const cookie = (await context.cookies(origin)).find(
    (c) => c.name === "dsh_portal_session",
  );
  if (cookie) tokens.add(cookie.value);
  return cookie;
}
async function login(username) {
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL(origin + "/devices");
  const cookie = await remember();
  assert.ok(cookie?.httpOnly);
}
async function logout() {
  await page.waitForLoadState("networkidle");
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL(origin + "/login");
}
async function visit(id) {
  return page.goto(origin + "/tickets/" + id, { waitUntil: "networkidle" });
}
async function post(id, input, status, suppliedOrigin = origin) {
  const response = await context.request.post(
    `${origin}/api/tickets/${id}/quote/accept`,
    { headers: suppliedOrigin ? { Origin: suppliedOrigin } : {}, data: input },
  );
  assert.equal(response.status(), status, await response.text());
  return response;
}
const command = (entry) => ({
  requestId: randomUUID(),
  expectedVersion: entry.ticket.version,
  quoteId: entry.quote.id,
  quoteRevision: entry.quote.revision,
});
async function shot(file) {
  const dialog = page.getByRole("dialog");
  if (await dialog.count()) {
    await dialog.waitFor({ state: "visible" });
    await dialog.evaluate(async (element) => {
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      await Promise.all(
        element
          .getAnimations({ subtree: true })
          .map((animation) => animation.finished.catch(() => {})),
      );
    });
    const box = await dialog.boundingBox();
    assert.ok(
      box && box.y >= 0 && box.y + box.height <= page.viewportSize().height,
      "Confirmation dialog fits the viewport",
    );
  }
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(screenshots, file),
    fullPage: (await page.getByRole("dialog").count()) === 0,
    animations: "disabled",
    style: "nextjs-portal { visibility: hidden !important; }",
  });
}
try {
  await local.waitForApi();
  const tech = await fixtures.technician("门户报价验收维修员");
  const a = await fixtures.quotedTask(tech, { title: "大厅空调维修报价" });
  const stale = await fixtures.quotedTask(tech, { title: "报价过期页面核对" });
  const uncertain = await fixtures.quotedTask(tech, {
    title: "确认结果不明后关闭核对",
  });
  const expired = await fixtures.quotedTask(tech, {
    title: "会话过期不可确认报价",
  });
  await context.clearCookies();
  await post(a.ticket.id, command(a), 401);
  await visit(a.ticket.id);
  await page.waitForURL(origin + "/login");
  await login("reporter.a");
  await post(a.ticket.id, command(a), 403, "https://untrusted.invalid");
  await post(a.ticket.id, command(a), 403, null);
  await post(
    a.ticket.id,
    { ...command(a), totalCents: 1, reporterId: "user-admin" },
    400,
  );
  await post(a.ticket.id, { ...command(a), quoteRevision: 2 }, 409);
  await visit(a.ticket.id);
  await page
    .getByRole("heading", { name: "维修报价 · 第 1 版", exact: true })
    .waitFor();
  const html = await page.content();
  for (const token of tokens) assert.equal(html.includes(token), false);
  assert.ok(
    html.includes("更换接线端子") && html.includes("59.98"),
    "Quote arrives in SSR HTML",
  );
  assert.equal(await page.evaluate(() => localStorage.length), 0);
  await page.getByRole("button", { name: "确认报价", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "确认维修报价",
    exact: true,
  });
  await dialog
    .getByText("确认金额：¥59.98（人民币）", { exact: true })
    .waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "确认报价", exact: true }).waitFor();
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS count FROM "ServiceOrder" WHERE "ticketId"=$1',
        [a.ticket.id],
      )
    ).rows[0].count,
    0,
  );
  await shot("portal-quote-desktop.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "确认报价", exact: true }).click();
  await shot("portal-quote-confirm-mobile.png");
  let lost = false;
  await page.route(
    `**/api/tickets/${a.ticket.id}/quote/accept`,
    async (route) => {
      bodies.push(route.request().postDataJSON());
      if (!lost) {
        lost = true;
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
  const submit = dialog.getByRole("button", {
    name: "确认报价并生成订单",
    exact: true,
  });
  await submit.click();
  await started;
  assert.ok(await submit.isDisabled());
  assert.ok(
    await dialog.getByRole("button", { name: /^取\s*消$/ }).isDisabled(),
  );
  await page.keyboard.press("Escape");
  assert.equal(await dialog.count(), 1);
  await page.mouse.click(2, 2);
  assert.equal(
    await dialog.count(),
    1,
    "Submitting dialog ignores mask clicks",
  );
  assert.equal(bodies.length, 1);
  release();
  await dialog.getByText(/尚未确认报价结果/).waitFor();
  await submit.click();
  await dialog.waitFor({ state: "hidden" });
  const orderPanel = page.getByRole("article", {
    name: "服务订单",
    exact: true,
  });
  await orderPanel
    .getByText("订单金额：¥59.98（人民币）", { exact: true })
    .waitFor();
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].quoteId, a.quote.id);
  assert.equal(bodies[0].quoteRevision, 1);
  assert.equal(bodies[0].expectedVersion, 3);
  assert.equal("totalCents" in bodies[0], false);
  assert.equal(
    await orderPanel.getByText("未接入支付", { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "确认报价", exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  const saved = (
    await db.query(
      'SELECT "id","totalCents","requestId" FROM "ServiceOrder" WHERE "ticketId"=$1',
      [a.ticket.id],
    )
  ).rows;
  assert.equal(saved.length, 1);
  assert.equal(saved[0].requestId, bodies[0].requestId);
  await page.reload();
  await orderPanel
    .getByText("订单金额：¥59.98（人民币）", { exact: true })
    .waitFor();
  await shot("portal-order-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot("portal-order-desktop.png");
  const { admin } = await fixtures.identities();
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
  web.on("pageerror", (error) => errors.push(error.message));
  await web.goto(
    "http://127.0.0.1:5173/service/admin/tickets?status=processing",
    { waitUntil: "networkidle" },
  );
  await web
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: a.ticket.code })
    .getByRole("button", { name: "详情", exact: true })
    .click();
  const webQuote = web.getByLabel("报价明细", { exact: true });
  await webQuote.getByText("已确认", { exact: true }).waitFor();
  await webQuote
    .getByText("用户已确认本版报价并生成服务订单；报价确认不代表已付款。", {
      exact: true,
    })
    .waitFor();
  await web.screenshot({
    path: path.join(screenshots, "service-quote-accepted.png"),
    animations: "disabled",
  });
  await web.close();

  await visit(stale.ticket.id);
  await page.getByRole("button", { name: "确认报价", exact: true }).click();
  await db.query('UPDATE "Ticket" SET "version"="version"+1 WHERE "id"=$1', [
    stale.ticket.id,
  ]);
  await submit.click();
  await dialog.getByText(/报价确认已变化|工单或报价已变化/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "确认报价", exact: true }).waitFor();
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS count FROM "ServiceOrder" WHERE "ticketId"=$1',
        [stale.ticket.id],
      )
    ).rows[0].count,
    0,
  );

  await visit(uncertain.ticket.id);
  await page.getByRole("button", { name: "确认报价", exact: true }).click();
  let uncertainWrites = 0;
  await page.route(
    `**/api/tickets/${uncertain.ticket.id}/quote/accept`,
    async (route) => {
      uncertainWrites++;
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      await response.dispose();
      return route.abort("failed");
    },
  );
  await submit.click();
  await dialog.getByText(/尚未确认报价结果/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await orderPanel
    .getByText("订单金额：¥59.98（人民币）", { exact: true })
    .waitFor();
  assert.equal(uncertainWrites, 1);

  await logout();
  await login("reporter.b");
  await visit(a.ticket.id);
  await page
    .getByRole("heading", { name: "未找到可访问的页面", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("article", { name: "服务订单", exact: true }).count(),
    0,
  );
  await post(a.ticket.id, command(a), 404);
  await page.goto(origin + "/devices");
  await logout();
  await login("reporter.a");
  await visit(expired.ticket.id);
  await page.getByRole("button", { name: "确认报价", exact: true }).click();
  const cookie = await remember();
  const expiredSession = await db.query(
    'UPDATE "Session" SET "expiresAt"=$1 WHERE "tokenHash"=$2',
    [new Date(0), createHash("sha256").update(cookie.value).digest("hex")],
  );
  assert.equal(
    expiredSession.rowCount,
    1,
    "Only this browser session is expired",
  );
  assert.equal(
    (
      await local.request(`/tickets/${expired.ticket.id}`, {
        cookie: "dsh_session=" + cookie.value,
      })
    ).response.status,
    401,
  );
  await submit.click();
  await page.waitForURL(origin + "/login");
  assert.equal(
    (
      await db.query(
        'SELECT COUNT(*)::int AS count FROM "ServiceOrder" WHERE "ticketId"=$1',
        [expired.ticket.id],
      )
    ).rows[0].count,
    0,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Portal quotes: SSR/private cookies, exact-version intent forwarding, Origin/scope, cancellation, in-flight protection, lost-response replay/close, stale-page conflict, expired session and desktop/mobile snapshots passed.",
  );
} catch (error) {
  await page
    .screenshot({
      path: path.join(local.root, ".local/portal-quotes-failure.png"),
      fullPage: true,
      animations: "disabled",
    })
    .catch(() => {});
  throw error;
} finally {
  release();
  await remember().catch(() => {});
  await context.close();
  for (const token of tokens)
    await local.logout("dsh_session=" + token).catch(() => {});
  await fixtures.cleanup();
  await db.end();
}

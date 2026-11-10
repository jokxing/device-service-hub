import assert from "node:assert/strict";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
import { randomUUID } from "node:crypto";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "revision.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "quote-revisions-browser-profile",
);
const portalOrigin = "http://127.0.0.1:3000",
  webOrigin = "http://127.0.0.1:5173";
const portalTokens = new Set(),
  bodies = [];
let release, notify, second, portal;
const gate = new Promise((resolve) => {
  release = resolve;
});
const started = new Promise((resolve) => {
  notify = resolve;
});
async function login(target, origin, username) {
  await target.goto(origin + "/login", { waitUntil: "networkidle" });
  await target
    .getByRole("textbox", { name: "账号", exact: true })
    .fill(username);
  await target
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await target.getByRole("button", { name: /^登\s*录$/ }).click();
  await target.waitForURL(
    origin + (origin === webOrigin ? "/service/devices" : "/devices"),
  );
  if (origin === portalOrigin) {
    const cookie = (await context.cookies(origin)).find(
      (c) => c.name === "dsh_portal_session",
    );
    assert.ok(cookie?.httpOnly);
    portalTokens.add(cookie.value);
  }
}
async function shot(target, name, reveal) {
  const dialog = target.getByRole("dialog");
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
        bounds.y + bounds.height <= target.viewportSize().height,
    );
  }
  if (reveal) {
    await reveal.scrollIntoViewIfNeeded();
    const record = await reveal.boundingBox();
    const modal = await dialog.boundingBox();
    assert.ok(
      record &&
        modal &&
        record.y >= modal.y &&
        record.y + record.height <= modal.y + modal.height,
      "History audit is visible inside the dialog",
    );
  }
  assert.ok(
    await target.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await target.screenshot({
    path: path.join(screenshots, name),
    fullPage: !(await dialog.count()),
    animations: "disabled",
    style: "nextjs-portal { visibility: hidden !important; }",
  });
}
try {
  await local.waitForApi();
  await context.clearCookies();
  const { reporter, admin } = await fixtures.identities();
  const tech = await fixtures.technician("修订报价页面验收维修员");
  const a = await fixtures.quotedTask(tech, { title: "中央空调维修方案修订" });
  const rejection = await local.request(
    `/tickets/${a.ticket.id}/quote/reject`,
    {
      cookie: reporter,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 3,
        quoteId: a.quote.id,
        quoteRevision: 1,
        reason: "预算超出预期，请调整维修方案",
      },
    },
  );
  assert.equal(rejection.response.status, 201);
  await login(page, webOrigin, tech.id);
  await page.goto(`${webOrigin}/service/tasks/${a.ticket.id}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "重新报价", exact: true }).click();
  const dialog = page.getByRole("dialog");
  assert.equal(
    await dialog.getByLabel("项目名称 1", { exact: true }).inputValue(),
    "更换接线端子",
  );
  assert.equal(
    await dialog.getByLabel("单价 1", { exact: true }).inputValue(),
    "19.99",
  );
  await dialog.getByLabel("项目名称 1", { exact: true }).fill("取消后不应保存");
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.getByRole("button", { name: "重新报价", exact: true }).click();
  assert.equal(
    await dialog.getByLabel("项目名称 1", { exact: true }).inputValue(),
    "更换接线端子",
  );
  const stale = await context.newPage();
  stale.on("pageerror", (error) => errors.push(error.message));
  await stale.goto(`${webOrigin}/service/tasks/${a.ticket.id}`, {
    waitUntil: "networkidle",
  });
  await stale.getByRole("button", { name: "重新报价", exact: true }).click();
  await dialog.getByLabel("项目名称 1", { exact: true }).fill("更换控制板");
  await dialog.getByLabel("数量 1", { exact: true }).fill("2");
  await dialog.getByLabel("单价 1", { exact: true }).fill("88.50");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot(page, "quote-revision-form-mobile.png");
  let first = true;
  await page.route(
    `**/api/tickets/${a.ticket.id}/quote/revisions`,
    async (route) => {
      bodies.push(route.request().postDataJSON());
      if (first) {
        first = false;
        const response = await route.fetch();
        assert.equal(response.status(), 201);
        second = await response.json();
        notify();
        await gate;
        await response.dispose();
        return route.abort("failed");
      }
      return route.continue();
    },
  );
  const submit = dialog.getByRole("button", { name: "提交报价", exact: true });
  await submit.click();
  await started;
  assert.ok(await submit.isDisabled());
  assert.ok(
    await dialog.getByRole("button", { name: /^取\s*消$/ }).isDisabled(),
  );
  await page.keyboard.press("Escape");
  assert.equal(await dialog.count(), 1);
  release();
  await dialog.getByText(/报价结果尚未确认/).waitFor();
  await submit.click();
  await dialog.waitFor({ state: "hidden" });
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].baseQuoteId, a.quote.id);
  assert.equal(bodies[0].baseQuoteRevision, 1);
  assert.equal(bodies[0].expectedVersion, 4);
  assert.equal(second.revision, 2);
  assert.equal(second.totalCents, 17701);
  await page.getByText("报价第 2 版", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "重新报价", exact: true }).count(),
    0,
  );
  await page
    .getByLabel("历史报价", { exact: true })
    .getByText("第 1 版 · 已拒绝", { exact: true })
    .click();
  await page
    .getByLabel("历史报价", { exact: true })
    .getByText("拒绝原因：预算超出预期，请调整维修方案", { exact: true })
    .waitFor();
  await shot(page, "quote-revision-history-mobile.png");
  await stale
    .getByRole("dialog")
    .getByRole("button", { name: "提交报价", exact: true })
    .click();
  await stale
    .getByRole("dialog")
    .getByText(/报价已提交或任务已变化/)
    .waitFor();
  await stale
    .getByRole("dialog")
    .getByRole("button", { name: /^取\s*消$/ })
    .click();
  await stale.getByText("报价第 2 版", { exact: true }).waitFor();
  await stale.close();

  portal = await context.newPage();
  portal.on("pageerror", (error) => errors.push(error.message));
  await login(portal, portalOrigin, "reporter.a");
  await portal.goto(`${portalOrigin}/tickets/${a.ticket.id}`, {
    waitUntil: "networkidle",
  });
  const latest = () =>
    portal.getByRole("article", { name: "维修报价", exact: true }).first();
  await latest()
    .getByRole("heading", { name: "维修报价 · 第 2 版", exact: true })
    .waitFor();
  await latest()
    .getByText("报价合计：¥177.01（人民币）", { exact: true })
    .waitFor();
  const history = portal.getByLabel("历史报价", { exact: true });
  await history.getByText("第 1 版 · 已拒绝", { exact: true }).click();
  await history
    .getByText("拒绝原因：预算超出预期，请调整维修方案", { exact: true })
    .waitFor();
  assert.equal(
    await history
      .getByRole("button", { name: /^(确认报价|拒绝报价)$/ })
      .count(),
    0,
  );
  await shot(portal, "portal-quote-revision-history.png");
  await portal.getByRole("button", { name: "确认报价", exact: true }).click();
  const rejectedSecond = await local.request(
    `/tickets/${a.ticket.id}/quote/reject`,
    {
      cookie: reporter,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 5,
        quoteId: second.id,
        quoteRevision: 2,
        reason: "请采用另一种配件方案",
      },
    },
  );
  assert.equal(rejectedSecond.response.status, 201);
  const third = await local.request(`/tickets/${a.ticket.id}/quote/revisions`, {
    cookie: tech.cookie,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: 6,
      baseQuoteId: second.id,
      baseQuoteRevision: 2,
      items: [
        {
          name: "维修控制板",
          quantity: 1,
          unitPriceCents: 15500,
          note: "保留原配件维修",
        },
      ],
    },
  });
  assert.equal(third.response.status, 201);
  assert.equal(third.value.revision, 3);
  await portal
    .getByRole("dialog")
    .getByRole("button", { name: "确认报价并生成订单", exact: true })
    .click();
  await portal
    .getByRole("dialog")
    .getByText(/报价确认已变化或订单已生成/)
    .waitFor();
  await portal
    .getByRole("dialog")
    .getByRole("button", { name: /^取\s*消$/ })
    .click();
  await latest()
    .getByRole("heading", { name: "维修报价 · 第 3 版", exact: true })
    .waitFor();
  await portal.waitForLoadState("networkidle");
  await portal.getByRole("button", { name: "确认报价", exact: true }).click();
  await portal
    .getByRole("dialog")
    .getByText("报价版本：第 3 版", { exact: true })
    .waitFor();
  await portal
    .getByRole("dialog")
    .getByRole("button", { name: "确认报价并生成订单", exact: true })
    .click();
  const order = portal.getByRole("article", { name: "服务订单", exact: true });
  await order
    .getByText("订单金额：¥155.00（人民币）", { exact: true })
    .waitFor();
  await order.getByText("第 3 版", { exact: true }).waitFor();
  assert.equal(
    await portal.getByRole("button", { name: /^(确认报价|拒绝报价)$/ }).count(),
    0,
  );
  await portal.setViewportSize({ width: 390, height: 844 });
  await shot(portal, "portal-quote-revision-order-mobile.png");
  await portal.reload({ waitUntil: "networkidle" });
  await order
    .getByText("订单金额：¥155.00（人民币）", { exact: true })
    .waitFor();
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
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.goto(`${webOrigin}/service/admin/tickets?status=processing`, {
    waitUntil: "networkidle",
  });
  await page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: a.ticket.code })
    .getByRole("button", { name: "详情", exact: true })
    .click();
  await page.getByText("报价第 3 版", { exact: true }).waitFor();
  await page
    .getByLabel("历史报价", { exact: true })
    .getByText("第 2 版 · 已拒绝", { exact: true })
    .click();
  await page
    .getByLabel("历史报价", { exact: true })
    .getByText("拒绝原因：请采用另一种配件方案", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "重新报价", exact: true }).count(),
    0,
  );
  await shot(
    page,
    "service-quote-revision-history.png",
    page.getByLabel("历史报价", { exact: true }).getByLabel("报价拒绝记录"),
  );
  assert.deepEqual(errors, []);
  console.log(
    "Quote revisions UI: rejected-item prefill/cancel, shared Web form reuse, exact lost-response replay, stale technician conflict, read-only history, portal stale-v2 conflict/v3 acceptance, correct order snapshot, admin view and mobile layouts passed.",
  );
} catch (error) {
  await portal
    ?.screenshot({
      path: path.join(local.root, ".local/quote-revisions-portal-failure.png"),
      fullPage: true,
    })
    .catch(() => {});
  await page
    .screenshot({
      path: path.join(local.root, ".local/quote-revisions-ui-failure.png"),
      fullPage: true,
    })
    .catch(() => {});
  throw error;
} finally {
  release();
  await context.close();
  for (const token of portalTokens)
    await local.logout("dsh_session=" + token).catch(() => {});
  await fixtures.cleanup();
  await db.end();
}

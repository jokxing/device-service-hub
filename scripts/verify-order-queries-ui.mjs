import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "orders.query.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "orders-query-profile",
);
const web = "http://127.0.0.1:5173",
  portal = "http://127.0.0.1:3000",
  tokens = new Set(),
  prefix = "服务订单查询 " + randomUUID().slice(0, 8);
let foreign;
const cmd = (version) => ({
  requestId: randomUUID(),
  expectedVersion: version,
});
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
async function portalLogin(username) {
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
  assert.ok(cookie?.httpOnly);
  tokens.add(cookie.value);
  return cookie;
}
async function choose(value) {
  await page.getByRole("combobox", { name: "订单状态", exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText(value, { exact: true })
    .click();
}
async function shot(name) {
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
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(screenshots, name),
    fullPage: !(name.includes("list") && name.includes("mobile")),
    animations: "disabled",
    style: "nextjs-portal{visibility:hidden!important}",
  });
}
const list = () => page.locator("tbody tr.ant-table-row");
try {
  await local.waitForApi();
  const { admin, reporter } = await fixtures.identities(),
    tech = await fixtures.technician("订单列表验收维修员"),
    other = await fixtures.technician("无订单验收维修员");
  const orders = [];
  for (let i = 0; i < 12; i++)
    orders.push(
      await fixtures.orderedTask(tech, {
        title: prefix + (i === 0 ? " 已完成" : " " + i),
      }),
    );
  const target = orders[0];
  for (const [url, body, cookie] of [
    [`/orders/${target.order.id}/start`, cmd(4), tech.cookie],
    [
      `/tasks/${target.ticket.id}/result`,
      { ...cmd(5), description: "已检查接线并更换端子，试运行正常。" },
      tech.cookie,
    ],
    [`/tickets/${target.ticket.id}/confirm`, cmd(6), reporter],
  ])
    assert.equal(
      (await local.request(url, { cookie, method: "POST", body })).response
        .status,
      201,
    );
  foreign = await fixtures.orderedTask(other, { title: prefix + " 另一用户" });
  await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
    "user-reporter-b",
    foreign.ticket.id,
  ]);
  await context.clearCookies();
  await page.goto(`${web}/service/orders/${target.order.id}`);
  await page.waitForURL("**/login");
  await auth(admin);
  await page.goto(web + "/service/orders", { waitUntil: "networkidle" });
  await page
    .getByRole("link", { name: "服务订单", exact: true, current: "page" })
    .waitFor();
  await choose("已完成");
  await page.waitForURL("**/service/orders?status=completed");
  const row = list().filter({ hasText: target.order.code });
  await row.getByRole("link", { name: "查看订单", exact: true }).waitFor();
  await shot("orders-list-admin-desktop.png");
  await row.getByRole("link", { name: "查看订单", exact: true }).click();
  await page.waitForURL(
    `**/service/orders/${target.order.id}?status=completed`,
  );
  await page.getByRole("heading", { name: "订单详情", exact: true }).waitFor();
  await page
    .getByLabel("服务订单", { exact: true })
    .getByText("已完成", { exact: true })
    .waitFor();
  await page
    .getByText("已检查接线并更换端子，试运行正常。", { exact: true })
    .waitFor();
  await shot("order-independent-admin-desktop.png");
  assert.equal(
    await page.getByRole("button", { name: "订单开工", exact: true }).count(),
    0,
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("link", { name: "返回订单列表", exact: true }).click();
  await page.waitForURL("**/service/orders?status=completed");
  await auth(tech.cookie);
  await page.goto(web + "/service/orders?status=awaiting_start", {
    waitUntil: "networkidle",
  });
  await list().first().waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr.ant-table-row").length === 10,
  );
  assert.equal(await list().count(), 10);
  await page.getByRole("listitem", { name: "2", exact: true }).click();
  await page.waitForURL("**/service/orders?status=awaiting_start&page=2");
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr.ant-table-row").length === 1,
  );
  assert.equal(await list().count(), 1);
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForURL("**/service/orders?status=awaiting_start");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr.ant-table-row").length === 10,
  );
  assert.equal(await list().count(), 10);
  await page.goForward({ waitUntil: "networkidle" });
  await page.waitForURL("**/service/orders?status=awaiting_start&page=2");
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr.ant-table-row").length === 1,
  );
  assert.equal(await list().count(), 1);
  await choose("已完成");
  await page.waitForURL("**/service/orders?status=completed");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr.ant-table-row").length === 1,
  );
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForURL("**/service/orders?status=awaiting_start&page=2");
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr.ant-table-row").length === 1,
  );
  await page.goto(web + "/service/orders?status=awaiting_start&page=100000", {
    waitUntil: "networkidle",
  });
  await page.waitForURL("**/service/orders?status=awaiting_start&page=2");
  await list().first().waitFor();
  await page.goto(web + "/service/orders?status=bad&page=invalid", {
    waitUntil: "networkidle",
  });
  await list().first().waitFor();
  await page.waitForFunction(
    () => document.querySelectorAll("tbody tr.ant-table-row").length === 10,
  );
  assert.equal(await list().count(), 10);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(web + "/service/orders?status=awaiting_start", {
    waitUntil: "networkidle",
  });
  await page.getByRole("list", { name: "服务订单列表", exact: true }).waitFor();
  assert.equal(await list().count(), 0);
  await shot("orders-list-technician-mobile.png");
  await page.goto(`${web}/service/orders/${target.order.id}`, {
    waitUntil: "networkidle",
  });
  await page
    .getByLabel("服务订单", { exact: true })
    .getByText("已完成", { exact: true })
    .waitFor();
  await page.getByRole("link", { name: "前往关联任务", exact: true }).waitFor();
  await shot("order-independent-technician-mobile.png");
  await page.goto(`${web}/service/orders/${foreign.order.id}`, {
    waitUntil: "networkidle",
  });
  await page.getByText("订单不存在或无权访问", { exact: true }).waitFor();
  await auth(await local.login(other.id));
  await page.goto(web + "/service/orders?status=completed", {
    waitUntil: "networkidle",
  });
  await page.getByText("暂无可访问的服务订单", { exact: true }).waitFor();
  await auth(reporter);
  await page.goto(web + "/service/orders", { waitUntil: "networkidle" });
  await page.getByText("请在用户门户查看本人订单", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("link", { name: "服务订单", exact: true }).count(),
    0,
  );
  const cookie = await portalLogin("reporter.a");
  const response = await page.goto(portal + "/orders?status=completed", {
    waitUntil: "networkidle",
  });
  assert.ok(response.headers()["cache-control"]?.includes("no-store"));
  const html = await response.text();
  assert.ok(html.includes(target.order.code));
  assert.ok(!html.includes(cookie.value));
  await page.getByRole("link", { name: "我的订单", exact: true }).waitFor();
  const card = page
    .getByRole("list", { name: "本人订单列表", exact: true })
    .locator("li")
    .filter({ hasText: target.order.code });
  await card.getByRole("link", { name: "查看订单详情 →", exact: true }).click();
  await page.waitForURL(`**/orders/${target.order.id}?status=completed`);
  await page.getByRole("heading", { name: "订单详情", exact: true }).waitFor();
  await page
    .getByLabel("服务订单", { exact: true })
    .getByText("已完成", { exact: true })
    .waitFor();
  await shot("portal-order-independent-mobile.png");
  await page.getByRole("link", { name: "← 返回我的订单", exact: true }).click();
  await page.waitForURL("**/orders?status=completed");
  await choose("待开工");
  await page.waitForURL("**/orders?status=awaiting_start");
  await page
    .getByRole("navigation", { name: "订单分页", exact: true })
    .getByRole("link", { name: "下一页", exact: true })
    .click();
  await page.waitForURL("**/orders?status=awaiting_start&page=2");
  await page
    .getByRole("navigation", { name: "订单分页", exact: true })
    .getByText(/第 2/)
    .waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await shot("portal-orders-list-mobile-page2.png");
  await page.goBack({ waitUntil: "networkidle" });
  await page.waitForURL("**/orders?status=awaiting_start");
  await page
    .getByRole("navigation", { name: "订单分页", exact: true })
    .getByText(/第 1/)
    .waitFor();
  const totals = (
    await local.request("/orders?status=awaiting_start", { cookie: reporter })
  ).value;
  const last = Math.max(1, Math.ceil(totals.total / totals.pageSize));
  await page.goto(portal + "/orders?status=awaiting_start&page=100000", {
    waitUntil: "networkidle",
  });
  await page.waitForURL(
    portal +
      "/orders?status=awaiting_start" +
      (last > 1 ? "&page=" + last : ""),
  );
  await page.goto(portal + "/orders?status=bad&page=no", {
    waitUntil: "networkidle",
  });
  await page.getByRole("list", { name: "本人订单列表", exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot("portal-orders-list-desktop.png");
  await page.goto(`${portal}/orders/${foreign.order.id}`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "未找到可访问的页面", exact: true })
    .waitFor();
  await page.goto(portal + "/orders/not-a-uuid", { waitUntil: "networkidle" });
  await page
    .getByRole("heading", { name: "未找到可访问的页面", exact: true })
    .waitFor();
  await portalLogin("reporter.b");
  await page.goto(`${portal}/orders/${target.order.id}`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "未找到可访问的页面", exact: true })
    .waitFor();
  await page.goto(portal + "/orders", { waitUntil: "networkidle" });
  assert.equal(
    await page.getByText(target.order.code, { exact: true }).count(),
    0,
  );
  await portalLogin("reporter.a");
  const current = (await context.cookies(portal)).find(
    (c) => c.name === "dsh_portal_session",
  );
  const expired = await db.query(
    'UPDATE "Session" SET "expiresAt"=$1 WHERE "tokenHash"=$2',
    [new Date(0), createHash("sha256").update(current.value).digest("hex")],
  );
  assert.equal(expired.rowCount, 1);
  await page.goto(`${portal}/orders/${target.order.id}`);
  await page.waitForURL(portal + "/login");
  if (process.argv.includes("--micro")) {
    await auth(admin);
    await page.goto(
      "http://127.0.0.1:4174/tickets/service/orders/" + target.order.id,
      { waitUntil: "networkidle" },
    );
    await page
      .getByRole("heading", { name: "订单详情", exact: true })
      .waitFor();
    await page
      .getByLabel("服务订单", { exact: true })
      .getByText("已完成", { exact: true })
      .waitFor();
    await page
      .getByRole("link", { name: "服务订单", exact: true, current: "page" })
      .waitFor();
    await page.reload({ waitUntil: "networkidle" });
    await page
      .getByRole("heading", { name: "订单详情", exact: true })
      .waitFor();
    await shot("micro-order-independent.png");
    await page.getByRole("link", { name: "返回订单列表", exact: true }).click();
    await page.waitForURL("**/tickets/service/orders");
    await page
      .getByRole("heading", { name: "服务订单", exact: true })
      .waitFor();
    console.log("Micro order deep link, refresh and list navigation passed.");
  }
  assert.deepEqual(errors, []);
  console.log(
    "Order query UI: admin/technician scoped lists, real second pages and URL navigation, filters/reset/out-of-range, read-only detail/refresh/back links, responsive cards, portal SSR/private no-store, cross-user and expired-session isolation passed.",
  );
} catch (error) {
  await page
    .screenshot({
      path: path.join(local.root, ".local/orders-query-ui-failure.png"),
      fullPage: true,
    })
    .catch(() => {});
  throw error;
} finally {
  for (const token of tokens)
    await local.logout("dsh_session=" + token).catch(() => {});
  await context.close();
  if (foreign)
    await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
      "user-reporter-a",
      foreign.ticket.id,
    ]);
  await fixtures.cleanup();
  await db.end();
}

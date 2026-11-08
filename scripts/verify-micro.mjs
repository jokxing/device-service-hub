import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import fs from "node:fs/promises";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const browser = await openLocalBrowser("micro-browser-profile");
const { context, page, screenshots, errors } = browser;
const host = "http://127.0.0.1:4174";
const title = "微前端工单验收 " + randomUUID().slice(0, 8);
let ticket;
const nav = page.getByRole("navigation", { name: "协同台导航" });
async function assertActiveTab(name) {
  await nav.getByRole("link", { name, exact: true, current: "page" }).waitFor();
  assert.equal(await nav.locator('a[aria-current="page"]').count(), 1);
}
async function assertLoginPosition(fits) {
  const card = await page.locator(".ant-card").boundingBox();
  const navigation = await nav.boundingBox();
  const height = page.viewportSize().height;
  const contentTop = navigation.y + navigation.height;
  assert.ok(
    card && card.y >= contentTop + 20,
    "Login card stays below navigation with padding",
  );
  if (fits) {
    assert.ok(
      Math.abs(card.y + card.height / 2 - (contentTop + height) / 2) <= 2,
      "Login centers within remaining viewport",
    );
    assert.ok(
      card.y + card.height <= height,
      "Login button and card fit in viewport",
    );
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollHeight <= innerHeight + 1,
      ),
      true,
      "No extra viewport-height scroll",
    );
  } else {
    assert.ok(
      card.y + card.height > height,
      "Short viewport scrolls instead of clipping the form",
    );
    await page
      .getByRole("button", { name: /^登\s*录$/ })
      .scrollIntoViewIfNeeded();
  }
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
}
async function login(username) {
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL(host + "/tickets/service/devices");
  await page.getByText("已连接本地服务与数据库", { exact: true }).waitFor();
  await assertActiveTab("工单后台");
}
async function logout() {
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL(host + "/tickets/login");
  await assertActiveTab("工单后台");
}
async function settled() {
  // Allow React passive cleanup and animation frame work without fixed sleeps.
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
}
try {
  await local.waitForApi();
  const reporter = await local.login("reporter.a");
  const result = await local.request("/tickets", {
    cookie: reporter,
    method: "POST",
    body: {
      requestId: randomUUID(),
      deviceId: "device-ac001",
      title,
      description: "本轮微前端挂载、弹窗与路由验证。",
      priority: "normal",
    },
  });
  assert.equal(result.response.status, 201);
  ticket = result.value;
  await context.clearCookies();
  await context.addInitScript(() => {
    const listeners = new Map();
    const add = EventTarget.prototype.addEventListener;
    const remove = EventTarget.prototype.removeEventListener;
    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options,
    ) {
      if (this === window && ["popstate", "hashchange"].includes(type)) {
        const set = listeners.get(type) ?? new Set();
        set.add(listener);
        listeners.set(type, set);
      }
      return add.call(this, type, listener, options);
    };
    EventTarget.prototype.removeEventListener = function (
      type,
      listener,
      options,
    ) {
      if (this === window) listeners.get(type)?.delete(listener);
      return remove.call(this, type, listener, options);
    };
    window.microListenerCount = () =>
      [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
  });
  await page.goto(host + "/", { waitUntil: "networkidle" });
  await assertActiveTab("工作台总览");
  const styleBefore = await nav.evaluate((el) => ({
    color: getComputedStyle(el).color,
    padding: getComputedStyle(el).padding,
    border: getComputedStyle(el).borderBottom,
  }));
  await page.screenshot({
    path: path.join(screenshots, "micro-shell-overview.png"),
    fullPage: true,
  });
  await nav.getByRole("link", { name: "工单后台", exact: true }).click();
  await page.waitForURL(host + "/tickets/login");
  await page
    .getByRole("heading", { name: "登录设备服务", exact: true })
    .waitFor();
  await assertActiveTab("工单后台");
  await page.reload({ waitUntil: "networkidle" });
  await assertActiveTab("工单后台");
  await page
    .getByRole("heading", { name: "登录设备服务", exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(screenshots, "micro-login-active.png"),
    fullPage: true,
  });
  await assertLoginPosition(true);
  await page.setViewportSize({ width: 390, height: 844 });
  await settled();
  await assertLoginPosition(true);
  await page.screenshot({
    path: path.join(screenshots, "micro-login-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 900, height: 480 });
  await settled();
  await assertLoginPosition(false);
  await page.screenshot({
    path: path.join(screenshots, "micro-login-short.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.evaluate(() => scrollTo(0, 0));
  await login("admin");
  await page.screenshot({
    path: path.join(screenshots, "micro-devices-active.png"),
    fullPage: true,
  });
  await page
    .getByRole("navigation", { name: "设备服务导航" })
    .getByRole("link", { name: "工单分派", exact: true })
    .click();
  await page.waitForURL(host + "/tickets/service/admin/tickets");
  await assertActiveTab("工单后台");
  const row = page.locator("tr.ant-table-row").filter({ hasText: title });
  await row.waitFor();
  assert.deepEqual(
    await nav.evaluate((el) => ({
      color: getComputedStyle(el).color,
      padding: getComputedStyle(el).padding,
      border: getComputedStyle(el).borderBottom,
    })),
    styleBefore,
    "Child styles do not alter host navigation",
  );
  assert.equal(await page.locator("[data-device-service-root]").count(), 1);
  assert.equal(
    await page
      .locator("[data-device-service-root]")
      .evaluate((el) => el.getRootNode() instanceof ShadowRoot),
    true,
  );
  assert.equal(
    await page.evaluate(
      () => document.head.querySelectorAll("style[data-css-hash]").length,
    ),
    0,
    "Ant Design styles remain inside child shadow root",
  );
  await row.getByRole("button", { name: /^详\s*情$/ }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByText("暂无现场照片", { exact: true }).waitFor();
  assert.equal(
    await dialog.evaluate((el) => el.getRootNode() instanceof ShadowRoot),
    true,
    "Modal portal stays inside child",
  );
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
  await page.screenshot({
    path: path.join(screenshots, "micro-ticket-detail.png"),
    fullPage: true,
  });
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("combobox", { name: "工单状态", exact: true }).click();
  const dropdown = page.locator(".ant-select-dropdown:visible");
  await dropdown.getByText("待分派", { exact: true }).click();
  await page.waitForURL(host + "/tickets/service/admin/tickets?status=pending");
  await page.reload({ waitUntil: "networkidle" });
  await row.waitFor();
  await page.goBack();
  await page.waitForURL(host + "/tickets/service/admin/tickets");
  await row.waitFor();
  await page.goForward();
  await page.waitForURL(host + "/tickets/service/admin/tickets?status=pending");
  await row.waitFor();
  await assertActiveTab("工单后台");
  await page.screenshot({
    path: path.join(screenshots, "micro-tickets-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("list", { name: "管理工单列表" }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "micro-tickets-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });

  let baseline;
  for (let index = 0; index < 4; index++) {
    await nav.getByRole("link", { name: "工作台总览", exact: true }).click();
    await page
      .getByRole("heading", { name: "设备服务，有序协同", exact: true })
      .waitFor();
    await page
      .locator("[data-device-service-root]")
      .waitFor({ state: "detached" });
    await settled();
    await assertActiveTab("工作台总览");
    const count = await page.evaluate(() => window.microListenerCount());
    baseline ??= count;
    assert.equal(
      count,
      baseline,
      "Repeated unmount does not accumulate route listeners",
    );
    assert.equal(await page.getByRole("dialog").count(), 0);
    await nav.getByRole("link", { name: "工单后台", exact: true }).click();
    await row.waitFor();
    assert.equal(await page.locator("[data-device-service-root]").count(), 1);
  }
  await logout();
  await login("reporter.a");
  await page.getByRole("cell", { name: "AC-001", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("cell", { name: "WP-002", exact: true }).count(),
    0,
  );
  await page.goto(host + "/tickets/service/admin/tickets", {
    waitUntil: "networkidle",
  });
  await page.getByText("当前角色无权访问工单分派", { exact: true }).waitFor();
  const denied = await context.request.get(host + "/api/admin/tickets");
  assert.equal(denied.status(), 403);
  await logout();
  await login("reporter.b");
  await page.getByRole("cell", { name: "WP-002", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("cell", { name: "AC-001", exact: true }).count(),
    0,
  );
  await logout();
  assert.deepEqual(errors, []);

  // A new document has an empty qiankun cache, so the entry failure is real.
  let unavailable = true;
  await page.route("http://127.0.0.1:5175/**", async (route) => {
    if (unavailable) await route.fulfill({ status: 503, body: "unavailable" });
    else await route.continue();
  });
  await page.goto(host + "/tickets/service/admin/tickets");
  await page.getByText("工单后台暂时无法加载", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "micro-load-failure.png"),
    fullPage: true,
  });
  unavailable = false;
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await page
    .getByRole("heading", { name: "登录设备服务", exact: true })
    .waitFor();
  // Both dev and built hosts can load the independently built child.
  await page.goto("http://127.0.0.1:5174/tickets/service/admin/tickets");
  await page
    .getByRole("heading", { name: "登录设备服务", exact: true })
    .waitFor();
  assert.deepEqual(
    errors.filter(
      (message) => !message.includes("Ticket application asset unavailable"),
    ),
    [],
    "No unexpected runtime errors after recovery",
  );
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Standalone child build loaded by dev and production hosts",
          "Cookie login, role scope and no frontend permission bypass",
          "Base route, URL filters, refresh and browser history",
          "Shadow DOM styles, Ant Design modal/select portals and 390px layout",
          "Four mount/unmount cycles keep one root and stable route listener counts",
          "Entry unavailable state and full-reload recovery",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local/micro-failure.png"),
    fullPage: true,
  });
  await fs.writeFile(
    path.join(local.root, ".local/micro-failure.txt"),
    String(error) +
      "\n" +
      errors.join("\n") +
      "\n" +
      (await page.locator("body").ariaSnapshot()),
  );
  throw error;
} finally {
  await context.request
    .post(host + "/api/auth/logout", { headers: { Origin: host } })
    .catch(() => {});
  await context.close();
  if (ticket)
    await db.query('DELETE FROM "Ticket" WHERE "id"=$1 AND "reporterId"=$2', [
      ticket.id,
      "user-reporter-a",
    ]);
  await local.dispose();
  await db.end();
}

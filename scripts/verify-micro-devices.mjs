import assert from "node:assert/strict";
import path from "node:path";
import fs from "node:fs/promises";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi();
const { context, page, screenshots, errors } = await openLocalBrowser(
  "micro-devices-browser-profile",
);
const host = "http://127.0.0.1:4174";
const nav = page.getByRole("navigation", { name: "协同台导航" });
const devices = page.locator("[data-devices-root]");
const list = page.getByRole("list", { name: "授权设备列表", exact: true });
async function active(name) {
  await nav.getByRole("link", { name, exact: true, current: "page" }).waitFor();
}
async function login(username) {
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL(host + "/tickets/service/devices");
  await page.getByText("已连接本地服务与数据库", { exact: true }).waitFor();
}
async function openDevices() {
  await nav.getByRole("link", { name: "设备台账", exact: true }).click();
  await active("设备台账");
}
async function logout() {
  await nav.getByRole("link", { name: "工单后台", exact: true }).click();
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL(host + "/tickets/login");
}
try {
  await local.waitForApi();
  await context.clearCookies();
  await context.addInitScript(() => {
    const add = EventTarget.prototype.addEventListener,
      remove = EventTarget.prototype.removeEventListener;
    const listeners = new Map();
    EventTarget.prototype.addEventListener = function (
      type,
      listener,
      options,
    ) {
      if (
        this === window &&
        ["popstate", "hashchange", "beforeunload"].includes(type)
      ) {
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
    window.deviceListenerCount = () =>
      [...listeners.values()].reduce((sum, set) => sum + set.size, 0);
    window.deviceAbortedReads = 0;
    const nativeFetch = window.fetch;
    window.fetch = (input, options) => {
      if (String(input).endsWith("/api/devices"))
        options?.signal?.addEventListener(
          "abort",
          () => window.deviceAbortedReads++,
        );
      return nativeFetch(input, options);
    };
  });
  await page.goto(host + "/devices", { waitUntil: "networkidle" });
  await page
    .getByRole("heading", { name: "请先登录设备服务", exact: true })
    .waitFor();
  await active("设备台账");
  assert.equal(await devices.count(), 1);
  assert.equal(
    await devices.evaluate((el) => el.getRootNode() instanceof ShadowRoot),
    true,
  );
  await page.getByRole("button", { name: "前往登录", exact: true }).click();
  await page.waitForURL(host + "/tickets/login");
  await active("工单后台");
  await login("reporter.a");
  await openDevices();
  await list.getByText("AC-001", { exact: true }).waitFor();
  assert.equal(await list.getByText("WP-002", { exact: true }).count(), 0);
  await page.goto(host + "/devices/invalid/nested", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "设备页面不存在", exact: true })
    .waitFor();
  await page.getByRole("link", { name: "返回设备台账", exact: true }).click();
  await list.getByText("AC-001", { exact: true }).waitFor();
  const root = await devices.elementHandle();
  await list.getByRole("link", { name: "查看设备详情 →", exact: true }).click();
  await page.waitForURL(host + "/devices/device-ac001");
  await page
    .getByRole("heading", { name: "中央空调 · 一楼大厅", exact: true })
    .waitFor();
  assert.equal(
    await root.evaluate((el) => el.isConnected),
    true,
    "Internal Vue routing preserves the mounted application",
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("KFR-120LW", { exact: true }).waitFor();
  await page.goBack();
  await list.getByText("AC-001", { exact: true }).waitFor();
  await page.goForward();
  await page.getByText("KFR-120LW", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "micro-vue-device-detail.png"),
    fullPage: true,
  });
  await page
    .getByRole("button", { name: "在服务后台查看", exact: true })
    .click();
  await page.waitForURL(
    host + "/tickets/service/devices?deviceId=device-ac001",
  );
  const dialog = page.getByRole("dialog");
  await dialog.getByText("型号：KFR-120LW", { exact: true }).waitFor();
  await active("工单后台");
  assert.equal(await devices.count(), 0);
  await page.reload({ waitUntil: "networkidle" });
  await dialog.getByText("型号：KFR-120LW", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "micro-device-navigation.png"),
    fullPage: true,
    animations: "disabled",
  });
  await dialog.getByRole("button", { name: "知道了", exact: true }).click();
  await page.waitForURL(host + "/tickets/service/devices");
  await logout();
  await openDevices();
  await page
    .getByRole("heading", { name: "请先登录设备服务", exact: true })
    .waitFor();
  assert.equal(await list.count(), 0);
  await page.getByRole("button", { name: "前往登录", exact: true }).click();
  await login("reporter.b");
  await openDevices();
  await list.getByText("WP-002", { exact: true }).waitFor();
  assert.equal(await list.getByText("AC-001", { exact: true }).count(), 0);
  await page.goto(host + "/devices/device-ac001", { waitUntil: "networkidle" });
  await page
    .getByRole("alert")
    .getByText("设备不存在或无权访问", { exact: true })
    .waitFor();
  assert.equal(
    (await context.request.get(host + "/api/devices/device-ac001")).status(),
    404,
  );
  await page.goto(host + "/tickets/service/devices?deviceId=device-ac001", {
    waitUntil: "networkidle",
  });
  await dialog.getByText("设备不存在或无权访问", { exact: true }).waitFor();
  await dialog.getByRole("button", { name: "关闭", exact: true }).click();
  await logout();
  await login("technician");
  await openDevices();
  await page.getByText("当前账号暂无可访问的设备", { exact: true }).waitFor();
  await logout();
  await login("admin");
  await openDevices();
  await list.getByText("AC-001", { exact: true }).waitFor();
  await list.getByText("WP-002", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "micro-vue-devices.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "micro-vue-devices-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });

  let baseline;
  for (let index = 0; index < 3; index++) {
    await nav.getByRole("link", { name: "工单后台", exact: true }).click();
    await page
      .getByRole("heading", { name: "工单分派", exact: true })
      .waitFor();
    assert.equal(await devices.count(), 0);
    assert.equal(await page.locator("[data-device-service-root]").count(), 1);
    await openDevices();
    await list.getByText("AC-001", { exact: true }).waitFor();
    assert.equal(await page.locator("[data-device-service-root]").count(), 0);
    assert.equal(await devices.count(), 1);
    await nav.getByRole("link", { name: "工作台总览", exact: true }).click();
    await page
      .getByRole("heading", { name: "设备服务，有序协同", exact: true })
      .waitFor();
    await devices.waitFor({ state: "detached" });
    const count = await page.evaluate(() => window.deviceListenerCount());
    baseline ??= count;
    assert.equal(
      count,
      baseline,
      "Vue/React switching does not accumulate route listeners",
    );
  }
  let fail = true;
  await page.route("**/api/devices", async (route) => {
    if (fail)
      await route.fulfill({
        status: 503,
        json: { message: "设备列表暂不可用" },
      });
    else await route.continue();
  });
  await openDevices();
  await page
    .getByRole("alert")
    .getByText("设备列表暂不可用", { exact: true })
    .waitFor();
  fail = false;
  await page.getByRole("button", { name: "重新读取", exact: true }).click();
  await list.getByText("AC-001", { exact: true }).waitFor();
  await page.unroute("**/api/devices");
  await page.route("**/api/devices", (route) =>
    route.fulfill({ status: 401, json: { message: "登录已过期" } }),
  );
  await page.getByRole("button", { name: "刷新设备", exact: true }).click();
  await page
    .getByRole("heading", { name: "请先登录设备服务", exact: true })
    .waitFor();
  assert.equal(await list.count(), 0);
  assert.equal(
    await page.getByText("陈管理员 · 管理员", { exact: true }).count(),
    0,
  );
  await page.unroute("**/api/devices");
  // Hold a successful read, leave the application, and prove its abort signal fires.
  let release;
  let intercepted;
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Device read was not intercepted")),
      10000,
    );
    intercepted = () => {
      clearTimeout(timer);
      resolve();
    };
  });
  const wait = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/api/devices", async (route) => {
    const response = await route.fetch();
    intercepted();
    await wait;
    await route.fulfill({ response }).catch(() => {});
  });
  await page.reload();
  await ready;
  const before = await page.evaluate(() => window.deviceAbortedReads);
  await nav.getByRole("link", { name: "工作台总览", exact: true }).click();
  await devices.waitFor({ state: "detached" });
  assert.ok(
    (await page.evaluate(() => window.deviceAbortedReads)) > before,
    "Leaving Vue cancels the in-flight read",
  );
  release();
  await page.unroute("**/api/devices");
  assert.equal(await list.count(), 0);
  assert.deepEqual(errors, []);
  let unavailable = true;
  await page.route("http://127.0.0.1:5177/**", (route) =>
    unavailable
      ? route.fulfill({ status: 503, body: "unavailable" })
      : route.continue(),
  );
  await page.goto(host + "/devices");
  await page.getByText("设备台账暂时无法加载", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "micro-vue-load-failure.png"),
    fullPage: true,
  });
  unavailable = false;
  await page.getByRole("button", { name: "重新加载", exact: true }).click();
  await list.getByText("AC-001", { exact: true }).waitFor();
  assert.deepEqual(
    errors.filter(
      (value) => !value.includes("Micro application asset unavailable"),
    ),
    [],
  );
  // Independent production build reads the same scoped API; it is not only a shell fragment.
  await page.goto("http://127.0.0.1:5174/devices", {
    waitUntil: "networkidle",
  });
  await list.getByText("AC-001", { exact: true }).waitFor();
  await list
    .getByRole("listitem")
    .filter({ hasText: "AC-001" })
    .getByRole("link", { name: "查看设备详情 →", exact: true })
    .click();
  await page
    .getByRole("button", { name: "在服务后台查看", exact: true })
    .click();
  await page.waitForURL(
    "http://127.0.0.1:5174/tickets/service/devices?deviceId=device-ac001",
  );
  await dialog.getByText("型号：KFR-120LW", { exact: true }).waitFor();
  await page.goto("http://127.0.0.1:4176/", { waitUntil: "networkidle" });
  await list.getByText("AC-001", { exact: true }).waitFor();
  await list.getByText("WP-002", { exact: true }).waitFor();
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Vue standalone and micro builds read real Cookie-scoped devices",
          "Four roles, unknown/unauthorized details, account switch and 401 cleanup",
          "Vue detail URLs, refresh/history and Vue→host→React device navigation",
          "Internal route preserves instance; cross-app unmount cancels reads and listeners stay stable",
          "390px layout, read retry, asset failure and recovery",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local/micro-devices-failure.png"),
    fullPage: true,
  });
  await fs.writeFile(
    path.join(local.root, ".local/micro-devices-failure.txt"),
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
  await local.dispose();
}

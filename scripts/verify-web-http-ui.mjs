import assert from "node:assert/strict";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const { context, page, screenshots, errors } = await openLocalBrowser(
  "web-http-browser-profile",
);
const origin = "http://127.0.0.1:5173";
const pending = [];
async function form() {
  await page
    .getByRole("textbox", { name: "账号", exact: true })
    .fill("reporter.a");
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
}
async function hold(pattern) {
  let ready;
  const started = new Promise((resolve) => {
    ready = resolve;
  });
  const routes = [];
  await page.route(pattern, (route) => {
    routes.push(route);
    pending.push(route);
    ready();
  });
  return {
    started,
    routes,
    async clear() {
      await page.unroute(pattern);
      for (const route of routes) await route.abort().catch(() => {});
    },
  };
}
try {
  await local.waitForApi();
  await context.clearCookies();
  await page.goto(origin + "/login", { waitUntil: "networkidle" });
  await page.clock.install();
  await form();
  await page.getByLabel("密码", { exact: true }).fill("wrong-password");
  await page.locator("button[type=submit]").click();
  await page.getByRole("alert").getByText("账号或密码错误").waitFor();

  // No upstream write is sent for deliberately stalled requests.
  const login = await hold("**/api/auth/login");
  await form();
  await page.locator("button[type=submit]").click();
  await login.started;
  await page.locator("button[type=submit]").dispatchEvent("click");
  await page.clock.fastForward(15001);
  await page.getByRole("alert").getByText("尚未确认登录结果，请重试").waitFor();
  assert.equal(login.routes.length, 1);
  assert.equal(
    await page.locator("button[type=submit]").isEnabled(),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "service-login-timeout.png"),
    fullPage: true,
  });
  await login.clear();

  const cancelled = await hold("**/api/auth/login");
  await page.locator("button[type=submit]").click();
  await cancelled.started;
  await page.getByRole("link", { name: "查看工单演示", exact: true }).click();
  await page.waitForURL("**/tickets");
  await page.clock.fastForward(20001);
  assert.equal(cancelled.routes.length, 1);
  assert.equal(new URL(page.url()).pathname, "/tickets");
  await cancelled.clear();

  await page.goto(origin + "/login", { waitUntil: "networkidle" });
  await form();
  await page.locator("button[type=submit]").click();
  await page.waitForURL("**/service/devices");
  await page.getByText("AC-001", { exact: true }).waitFor();
  const logout = await hold("**/api/auth/logout");
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await logout.started;
  await page.clock.fastForward(15001);
  await page
    .getByRole("alert")
    .getByText("退出未完成，请核对登录状态后重试")
    .waitFor();
  assert.equal(new URL(page.url()).pathname, "/service/devices");
  assert.equal(logout.routes.length, 1);
  await logout.clear();

  const devices = await hold("**/api/devices");
  await page.reload({ waitUntil: "domcontentloaded" });
  await devices.started;
  // Development StrictMode may mount/cancel/remount the read effect once.
  await page.waitForTimeout(200);
  const initialReads = devices.routes.length;
  await page.clock.fastForward(20001);
  await page.getByText("请求超时，请稍后重试", { exact: true }).waitFor();
  assert.equal(devices.routes.length, initialReads, "Timeout does not retry reads");
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(screenshots, "service-devices-timeout-mobile.png"),
    fullPage: true,
  });
  await devices.clear();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("AC-001", { exact: true }).waitFor();
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL("**/login");
  assert.deepEqual(errors, []);
  console.log(
    "Web HTTP UI: login 401, submission timeout/re-entry, leave-page cancellation, logout timeout retains session, read timeout/recovery and mobile error layout passed. Timers accelerated; stalled requests did not reach the API.",
  );
} catch (error) {
  await page
    .screenshot({
      path: path.join(local.root, ".local/web-http-failure.png"),
      fullPage: true,
    })
    .catch(() => {});
  throw error;
} finally {
  for (const route of pending) await route.abort().catch(() => {});
  await context.request
    .post(origin + "/api/auth/logout", { headers: { Origin: origin } })
    .catch(() => {});
  await context.close();
}

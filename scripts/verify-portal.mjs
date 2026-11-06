import assert from "node:assert/strict";
import path from "node:path";
import { createHash } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const { context, page, screenshots, errors } = await openLocalBrowser(
  "portal-browser-profile",
);
const origin = "http://127.0.0.1:3000";
const tokens = new Set();
const digest = (token) => createHash("sha256").update(token).digest("hex");

async function rememberCookie() {
  const cookie = (await context.cookies(origin)).find(
    (value) => value.name === "dsh_portal_session",
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
  await page.getByRole("heading", { name: "我的设备", exact: true }).waitFor();
  const cookie = await rememberCookie();
  assert.ok(cookie, "Portal must issue a session cookie");
  assert.equal(cookie.httpOnly, true);
  assert.equal(cookie.sameSite, "Strict");
  assert.equal(cookie.path, "/");
  return cookie;
}
async function logout() {
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL(origin + "/login");
  await page.getByRole("textbox", { name: "账号", exact: true }).waitFor();
  assert.equal(
    (await context.cookies(origin)).some(
      (value) => value.name === "dsh_portal_session",
    ),
    false,
  );
}
async function rawDevicePage(id) {
  return context.request.get(origin + "/devices/" + id);
}
async function assertPrivate(response) {
  const header = response.headers()["cache-control"] ?? "";
  assert.ok(header.includes("no-store"), "Personal HTML must not be cached");
  const text = await response.text();
  for (const token of tokens)
    assert.equal(
      text.includes(token),
      false,
      "Session token must not appear in HTML",
    );
  return text;
}

try {
  await local.waitForApi();
  await context.clearCookies();
  await page.goto(origin + "/devices/device-ac001", {
    waitUntil: "networkidle",
  });
  await page.waitForURL(origin + "/login");
  await page.screenshot({
    path: path.join(screenshots, "portal-login.png"),
    fullPage: true,
  });

  // The adapter retains strict Origin checks instead of opening an unrestricted proxy.
  for (const suppliedOrigin of [undefined, "https://untrusted.invalid"]) {
    const denied = await context.request.post(origin + "/api/auth/login", {
      headers: suppliedOrigin ? { Origin: suppliedOrigin } : {},
      data: {
        username: "reporter.a",
        password: process.env.SEED_ACCOUNT_PASSWORD,
      },
    });
    assert.equal(denied.status(), 403);
  }
  const wrongPassword = await context.request.post(origin + "/api/auth/login", {
    headers: { Origin: origin },
    data: { username: "reporter.a", password: "incorrect-password" },
  });
  assert.equal(wrongPassword.status(), 401);
  const forged = await context.request.post(origin + "/api/auth/login", {
    headers: { Origin: origin },
    data: {
      username: "reporter.a",
      password: process.env.SEED_ACCOUNT_PASSWORD,
      role: "admin",
    },
  });
  assert.equal(forged.status(), 400);

  const cookieA = await login("reporter.a");
  const navigation = page.getByRole("navigation", {
    name: "门户导航",
    exact: true,
  });
  assert.equal(
    await navigation
      .getByRole("link", { name: "我的设备", exact: true })
      .getAttribute("aria-current"),
    "true",
  );
  assert.equal(await page.getByText("WP-002", { exact: true }).count(), 0);
  await page.getByText("AC-001", { exact: true }).waitFor();
  const htmlA = await assertPrivate(
    await context.request.get(origin + "/devices"),
  );
  assert.ok(
    htmlA.includes("AC-001"),
    "Authorized data must be present in server-rendered HTML",
  );
  assert.equal(htmlA.includes("WP-002"), false);
  await page.screenshot({
    path: path.join(screenshots, "portal-devices.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "查看设备详情 →", exact: true }).click();
  await page.getByRole("heading", { name: "设备详情", exact: true }).waitFor();
  await page.getByText("KFR-120LW", { exact: true }).waitFor();
  assert.equal(
    await navigation
      .getByRole("link", { name: "我的设备", exact: true })
      .getAttribute("aria-current"),
    "true",
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("KFR-120LW", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "portal-device-detail.png"),
    fullPage: true,
  });

  const crossUser = await assertPrivate(await rawDevicePage("device-wp002"));
  const unknown = await assertPrivate(await rawDevicePage("missing-device"));
  assert.equal(crossUser.includes("ISG 50-160"), false);
  assert.ok(crossUser.includes("未找到可访问的页面"));
  assert.ok(unknown.includes("未找到可访问的页面"));
  assert.equal(
    crossUser.includes("NEXT_HTTP_ERROR_FALLBACK;404"),
    unknown.includes("NEXT_HTTP_ERROR_FALLBACK;404"),
  );

  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "portal-device-detail-mobile.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "← 返回我的设备", exact: true }).click();
  await page.getByRole("heading", { name: "我的设备", exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "portal-devices-mobile.png"),
    fullPage: true,
  });
  await navigation.getByRole("link", { name: "我的报修", exact: true }).click();
  await page.getByRole("heading", { name: "我的报修", exact: true }).waitFor();
  assert.equal(
    await navigation
      .getByRole("link", { name: "我的报修", exact: true })
      .getAttribute("aria-current"),
    "true",
  );
  assert.equal(await navigation.locator(".ant-menu-item-selected").count(), 1);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await navigation.screenshot({
    path: path.join(screenshots, "portal-navigation-mobile.png"),
  });
  await navigation.getByRole("link", { name: "我的设备", exact: true }).click();
  await page.getByRole("heading", { name: "我的设备", exact: true }).waitFor();

  const csrfLogout = await context.request.post(origin + "/api/auth/logout", {
    headers: { Origin: "https://untrusted.invalid" },
  });
  assert.equal(csrfLogout.status(), 403);
  await logout();
  const revoked = await local.request("/auth/me", {
    cookie: "dsh_session=" + cookieA.value,
  });
  assert.equal(revoked.response.status, 401);
  await login("reporter.b");
  await page.getByText("WP-002", { exact: true }).waitFor();
  assert.equal(await page.getByText("AC-001", { exact: true }).count(), 0);
  const htmlB = await assertPrivate(
    await context.request.get(origin + "/devices"),
  );
  assert.ok(htmlB.includes("WP-002"));
  assert.equal(htmlB.includes("AC-001"), false);
  await page.goBack();
  // A history entry must re-authorize with the new account rather than reuse A's UI.
  assert.equal(await page.getByText("AC-001", { exact: true }).count(), 0);
  assert.equal(
    await page.getByText("张明 · 报修用户", { exact: true }).count(),
    0,
  );
  await page.goto(origin + "/devices/device-ac001", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "未找到可访问的页面", exact: true })
    .waitFor();
  await page.goto(origin + "/devices", { waitUntil: "networkidle" });
  await logout();

  for (const username of ["admin", "technician"]) {
    const forbidden = await context.request.post(origin + "/api/auth/login", {
      headers: { Origin: origin },
      data: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
    });
    assert.equal(forbidden.status(), 403);
    assert.equal(
      (await context.cookies(origin)).some(
        (value) => value.name === "dsh_portal_session",
      ),
      false,
    );
  }

  const expiring = await login("reporter.a");
  const expired = await db.query(
    'UPDATE "Session" SET "expiresAt"=$1 WHERE "tokenHash"=$2',
    [new Date(Date.now() - 60000).toISOString(), digest(expiring.value)],
  );
  assert.equal(expired.rowCount, 1);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForURL(origin + "/login");
  assert.equal(await page.getByText("AC-001", { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "未登录深链接跳转与真实账号登录",
          "HttpOnly/Strict/根路径 Cookie，令牌不进入 HTML",
          "登录/退出 Origin 校验与越权字段拒绝",
          "服务端 HTML 包含当前授权设备，个人响应 no-store",
          "详情直达与刷新、跨账号及未知设备一致拒绝",
          "退出撤销后端会话、切换账号与过期会话清理",
          "非报修角色入口拒绝",
          "桌面与 390px 手机布局，无运行或 hydration 错误",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local/portal-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await rememberCookie();
  await context.close();
  for (const token of tokens)
    await local.logout("dsh_session=" + token).catch(() => {});
  await db.end();
}

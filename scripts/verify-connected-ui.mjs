import assert from "node:assert/strict";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { openLocalBrowser } from "./lib/browser.mjs";

const { root, context, page, screenshots, errors } = await openLocalBrowser(
  "connected-browser-profile",
);
loadEnvFile(path.join(root, ".env"));
async function login(username) {
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL("**/service/devices");
  await page.getByText("已连接本地服务与数据库", { exact: true }).waitFor();
}
async function logout() {
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL("**/login");
  await page.getByRole("textbox", { name: "账号", exact: true }).waitFor();
}
try {
  await context.clearCookies();
  await page.goto("http://127.0.0.1:5173/service/devices", {
    waitUntil: "networkidle",
  });
  await page.waitForURL("**/login");
  await page.getByRole("textbox", { name: "账号", exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "service-login.png"),
    fullPage: true,
  });
  await login("reporter.a");
  await page.getByRole("cell", { name: "AC-001", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("cell", { name: "WP-002", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "详情", exact: true }).click();
  await page.getByText("型号：KFR-120LW", { exact: true }).waitFor();
  await page.getByRole("button", { name: "知道了", exact: true }).click();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("cell", { name: "AC-001", exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "service-devices.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("list", { name: "设备列表", exact: true }).waitFor();
  assert.equal(await page.getByRole("table").count(), 0);
  await page.getByRole("button", { name: /^详\s*情$/ }).click();
  await page.getByText("型号：KFR-120LW", { exact: true }).waitFor();
  await page.getByRole("button", { name: "知道了", exact: true }).click();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "service-devices-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await logout();
  await login("reporter.b");
  await page.getByRole("cell", { name: "WP-002", exact: true }).waitFor();
  assert.equal(
    await page.getByRole("cell", { name: "AC-001", exact: true }).count(),
    0,
  );
  await logout();
  await login("admin");
  await page.getByRole("cell", { name: "AC-001", exact: true }).waitFor();
  await page.getByRole("cell", { name: "WP-002", exact: true }).waitFor();
  await logout();
  await login("technician");
  await page.getByText("当前账号暂无可访问的设备", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await logout();
  await page.getByRole("link", { name: "查看工单演示", exact: true }).click();
  await page.waitForURL("**/tickets");
  await page.getByRole("heading", { name: "工单工作台." }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "未登录跳转",
          "真实账号登录与设备详情",
          "刷新恢复 Cookie 会话",
          "四账号数据范围",
          "退出与账号切换清理",
          "窄屏布局",
          "演示入口独立",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} finally {
  await context.close();
}

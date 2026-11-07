import assert from "node:assert/strict";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { openLocalBrowser } from "./lib/browser.mjs";
const { root, context, page, screenshots, errors } = await openLocalBrowser(
  "device-scan-browser-profile",
);
loadEnvFile(path.join(root, ".env"));
try {
  await context.clearCookies();
  await page.goto("http://127.0.0.1:5173/login");
  await page
    .getByRole("textbox", { name: "账号", exact: true })
    .fill("reporter.a");
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL("**/service/devices");
  await page.getByRole("button", { name: "详情", exact: true }).click();
  const tag = page.getByRole("img", { name: "设备二维码 AC-001", exact: true });
  await tag.waitFor();
  assert.equal(await tag.locator("svg").count(), 1);
  assert.ok(await tag.locator("svg path").count());
  await page
    .getByText("扫码后仍需校验当前账号的设备权限", { exact: true })
    .waitFor();
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(screenshots, "device-tag-desktop.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({
    path: path.join(screenshots, "device-tag-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.getByRole("button", { name: "知道了", exact: true }).click();
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Authorized real device detail renders QR SVG",
          "Desktop and narrow screen without overflow",
          "No browser runtime errors",
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

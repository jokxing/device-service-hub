import assert from "node:assert/strict";
import path from "node:path";
import { openLocalBrowser } from "./lib/browser.mjs";
const { context, page, screenshots, errors } = await openLocalBrowser(
  "mobile-web-browser-profile",
);
const origin = "http://127.0.0.1:8081";
try {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(origin, { waitUntil: "networkidle", timeout: 60000 });
  await page.getByRole("heading", { name: "设备服务", exact: true }).waitFor();
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "mobile-web-home.png"),
    fullPage: true,
  });
  await page.getByRole("button", { name: "进入设备服务", exact: true }).click();
  await page.waitForURL("**/login");
  await page.getByRole("heading", { name: "登录设备服务", exact: true }).waitFor();
  await page.goBack();
  await page.getByRole("button", { name: "查看报修须知", exact: true }).click();
  await page.waitForURL("**/guide");
  await page
    .getByRole("heading", { name: "服务角色与访问范围", exact: true })
    .waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page
    .getByText("移动端报修、扫码与拍照上传尚未开放。", { exact: true })
    .waitFor();
  await page.screenshot({
    path: path.join(screenshots, "mobile-web-guide.png"),
    fullPage: true,
  });
  await page.goBack();
  await page.getByRole("heading", { name: "设备服务", exact: true }).waitFor();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        environment: "React Native Web preview",
        checks: [
          "390px layout",
          "Guide route and reload",
          "Back navigation",
          "No runtime errors",
        ],
        excludes: ["Android runtime", "camera", "native login"],
      },
      null,
      2,
    ),
  );
} finally {
  await context.close();
}

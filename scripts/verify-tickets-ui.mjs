import assert from "node:assert/strict";
import path from "node:path";
import { openLocalBrowser } from "./lib/browser.mjs";
import { openLocalApi } from "./lib/local-api.mjs";

const local = openLocalApi();
const database = await local.connectDatabase();
const { context, page, screenshots, errors } = await openLocalBrowser(
  "tickets-browser-profile",
);
const payloads = [];
let dropped = false;
let created;
const title = "自动验收：空调制冷异常 " + Date.now();
async function login(username) {
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL("**/service/devices");
  await page
    .getByRole("cell", {
      name: username === "reporter.a" ? "AC-001" : "WP-002",
      exact: true,
    })
    .waitFor();
}
async function logout() {
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL("**/login");
}
try {
  await context.clearCookies();
  await page.goto("http://127.0.0.1:5173/service/tickets", {
    waitUntil: "networkidle",
  });
  await page.waitForURL("**/login");
  await login("reporter.a");
  await page.getByRole("button", { name: /^报\s*修$/ }).click();
  await page.getByRole("textbox", { name: "问题标题" }).fill("   ");
  await page.getByRole("button", { name: "提交报修", exact: true }).click();
  await page.getByText("请简要描述问题", { exact: true }).waitFor();
  await page
    .getByRole("textbox", { name: "问题标题" })
    .fill("  " + title + "  ");
  await page
    .getByRole("textbox", { name: "问题描述" })
    .fill("自动验收临时记录：空调运行但不制冷，请检查。");
  await page.getByRole("combobox", { name: "优先级" }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("紧急", { exact: true })
    .click();

  await page.route("**/api/tickets", async (route) => {
    if (route.request().method() !== "POST") {
      await route.continue();
      return;
    }
    payloads.push(route.request().postDataJSON());
    if (!dropped) {
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      created = await response.json();
      dropped = true;
      // The database committed, but the browser deliberately loses the response.
      await route.abort("failed");
    } else {
      await route.continue();
    }
  });
  await page.getByRole("button", { name: "提交报修", exact: true }).click();
  await page
    .getByText("尚未确认提交结果，可重试相同内容，或先查看我的报修。", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "提交报修", exact: true }).click();
  await page.waitForURL("**/service/tickets/" + created.id);
  await page.getByRole("heading", { name: "报修详情", exact: true }).waitFor();
  await page.getByText(title, { exact: true }).waitFor();
  assert.equal(payloads.length, 2);
  assert.equal(
    payloads[0].requestId,
    payloads[1].requestId,
    "Network retry keeps the same submission intent",
  );
  const count = await database.query(
    'SELECT COUNT(*)::int AS count FROM "Ticket" WHERE "requestId"=$1 AND "reporterId"=$2',
    [payloads[0].requestId, "user-reporter-a"],
  );
  assert.equal(count.rows[0].count, 1);
  await page.getByText("待分派", { exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText(title, { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "service-ticket-detail.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "返回我的报修", exact: true }).click();
  await page.waitForURL("**/service/tickets");
  await page.getByRole("heading", { name: "我的报修", exact: true }).waitFor();
  await page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: title })
    .waitFor();
  await page.getByText(title, { exact: true }).waitFor();
  await page.locator(".ant-spin-spinning").waitFor({ state: "hidden" });
  await page.screenshot({
    path: path.join(screenshots, "service-my-tickets.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileRecord = page
    .getByRole("list", { name: "报修记录", exact: true })
    .getByRole("article")
    .filter({ hasText: title });
  await mobileRecord.waitFor();
  assert.equal(await page.getByRole("table").count(), 0);
  await page.screenshot({
    path: path.join(screenshots, "service-my-tickets-mobile.png"),
    fullPage: true,
  });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await mobileRecord
    .getByRole("link", { name: "查看详情", exact: true })
    .click();
  await page.getByRole("heading", { name: "报修详情", exact: true }).waitFor();
  await page.getByText("报修已提交，等待管理员分派", { exact: true }).waitFor();
  await page.getByText(title, { exact: true }).waitFor();
  await page.locator(".ant-spin-spinning").waitFor({ state: "hidden" });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "service-ticket-mobile.png"),
    fullPage: true,
  });
  await page.setViewportSize({ width: 1440, height: 1100 });
  await logout();
  await login("reporter.b");
  await page
    .getByRole("navigation", { name: "设备服务导航" })
    .getByRole("link", { name: "我的报修", exact: true })
    .click();
  await page.getByRole("heading", { name: "我的报修", exact: true }).waitFor();
  await page.getByRole("table").waitFor();
  assert.equal(await page.getByText(title, { exact: true }).count(), 0);
  await page.goto("http://127.0.0.1:5173/service/tickets/" + created.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("报修记录不存在或无权访问", { exact: true }).waitFor();
  assert.equal(await page.getByText(title, { exact: true }).count(), 0);
  await logout();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "真实文字报修与字段校验",
          "已提交但响应丢失后重试只保留一单",
          "本人列表和详情及刷新回看",
          "跨账号详情拦截与页面清理",
          "桌面和窄屏布局",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} finally {
  await context.close();
  const ids = [...new Set(payloads.map((payload) => payload.requestId))];
  if (ids.length)
    await database.query(
      'DELETE FROM "Ticket" WHERE "requestId"=ANY($1::uuid[]) AND "reporterId"=$2',
      [ids, "user-reporter-a"],
    );
  await database.end();
}

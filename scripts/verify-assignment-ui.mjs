import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const { context, page, screenshots, errors } = await openLocalBrowser(
  "assignment-browser-profile",
);
const requestId = randomUUID();
const techId = "assignment.ui." + randomUUID().replaceAll("-", "").slice(0, 20);
const title = "分派浏览器验收 " + Date.now();
const bodies = [];
let ticket;
let lost = false;
async function login(username) {
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL("**/service/devices");
  await page.getByRole("heading", { name: "设备台账", exact: true }).waitFor();
}
async function logout() {
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL("**/login");
}
async function filter(status) {
  await page.getByRole("combobox", { name: "工单状态", exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText(status, { exact: true })
    .click();
  await page.waitForURL(
    status === "待分派"
      ? "**/service/admin/tickets?status=pending"
      : "**/service/admin/tickets?status=assigned",
  );
}
async function choose(name) {
  await page.getByRole("combobox", { name: "维修人员", exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText(name, { exact: true })
    .click();
}
try {
  await db.query(
    'INSERT INTO "User" ("id","username","name","role","passwordHash","active") SELECT $1,$1,$2,\'technician\',"passwordHash",true FROM "User" WHERE "id"=$3',
    [techId, "临时验收维修员", "user-technician"],
  );
  const reporter = await local.login("reporter.a");
  const created = await local.request("/tickets", {
    cookie: reporter,
    method: "POST",
    body: {
      requestId,
      deviceId: "device-ac001",
      title,
      description: "管理员分派浏览器临时验收：请检查设备异常。",
      priority: "urgent",
    },
  });
  assert.equal(created.response.status, 201);
  ticket = created.value;
  await context.clearCookies();
  await page.goto("http://127.0.0.1:5173/service/admin/tickets", {
    waitUntil: "networkidle",
  });
  await page.waitForURL("**/login");
  await login("admin");
  await page
    .getByRole("navigation", { name: "设备服务导航" })
    .getByRole("link", { name: "工单分派", exact: true })
    .click();
  await filter("待分派");
  const row = page.locator("tbody tr.ant-table-row").filter({ hasText: title });
  await row.waitFor();
  await row.getByRole("button", { name: /^分\s*派$/ }).click();
  await page.getByRole("combobox", { name: "维修人员", exact: true }).waitFor();
  await page.getByRole("button", { name: "确认分派", exact: true }).click();
  await page.getByText("请选择维修人员", { exact: true }).waitFor();
  await choose("临时验收维修员");
  await page.getByRole("button", { name: /^取\s*消$/ }).click();
  await row.getByRole("button", { name: /^分\s*派$/ }).click();
  await page.getByText("选择维修人员", { exact: true }).waitFor();
  await choose("临时验收维修员");
  await db.query('UPDATE "User" SET "active"=false WHERE "id"=$1', [techId]);
  await page.getByRole("button", { name: "确认分派", exact: true }).click();
  await page
    .getByText("维修人员不存在或已停用，请重新选择", { exact: true })
    .waitFor();
  await choose("王志远");
  await page.route(
    `**/api/admin/tickets/${ticket.id}/assign`,
    async (route) => {
      bodies.push(route.request().postDataJSON());
      if (!lost) {
        const response = await route.fetch();
        assert.equal(response.status(), 201);
        lost = true;
        await route.abort("failed");
      } else await route.continue();
    },
  );
  await page.getByRole("button", { name: "确认分派", exact: true }).click();
  await page
    .getByText("尚未确认分派结果，可重试相同选择，或关闭后刷新列表核对。", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "确认分派", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(bodies.length, 2);
  assert.equal(bodies[0].requestId, bodies[1].requestId);
  await filter("待接单");
  await row.waitFor();
  await row.getByText("王志远", { exact: true }).waitFor();
  assert.equal(await row.getByRole("button", { name: /^分\s*派$/ }).count(), 0);
  await page.reload({ waitUntil: "networkidle" });
  await row.waitFor();
  await page.screenshot({
    path: path.join(screenshots, "service-admin-tickets.png"),
    fullPage: true,
  });
  await row.getByRole("button", { name: /^详\s*情$/ }).click();
  await page.getByText(/陈管理员 将工单分派给 王志远/).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "service-admin-ticket-detail.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.setViewportSize({ width: 390, height: 844 });
  const card = page
    .getByRole("list", { name: "管理工单列表", exact: true })
    .getByRole("article")
    .filter({ hasText: title });
  await card.waitFor();
  assert.equal(await page.getByRole("table").count(), 0);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "service-admin-tickets-mobile.png"),
    fullPage: true,
  });
  await card.getByRole("button", { name: /^详\s*情$/ }).click();
  await page.getByText(/陈管理员 将工单分派给 王志远/).waitFor();
  const dialog = page.getByRole("dialog");
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
  const bounds = await dialog.boundingBox();
  assert.ok(
    bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391,
    "Mobile dialog stays within the viewport width",
  );
  await dialog.screenshot({
    path: path.join(screenshots, "service-admin-ticket-detail-mobile.png"),
  });
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await logout();
  await login("reporter.a");
  await page.goto("http://127.0.0.1:5173/service/tickets/" + ticket.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("王志远", { exact: true }).waitFor();
  await page.getByText("已分派维修人员，等待接单", { exact: true }).waitFor();
  await page.goto("http://127.0.0.1:5173/service/admin/tickets", {
    waitUntil: "networkidle",
  });
  await page.getByText("当前角色无权访问工单分派", { exact: true }).waitFor();
  assert.equal(await page.getByRole("table").count(), 0);
  await logout();
  await login("reporter.b");
  await page.goto("http://127.0.0.1:5173/service/tickets/" + ticket.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("报修记录不存在或无权访问", { exact: true }).waitFor();
  await logout();
  const audit = await db.query(
    'SELECT COUNT(*)::int AS count FROM "TicketAssignment" WHERE "ticketId"=$1',
    [ticket.id],
  );
  assert.equal(audit.rows[0].count, 1);
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "管理员状态筛选、分派与刷新",
          "关闭表单清理选择",
          "维修人员停用后的提交拦截",
          "提交成功但响应丢失后重试只写一次",
          "桌面表格与窄屏卡片",
          "操作人记录与本人分派结果",
          "非管理员直达拦截与跨用户隔离",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local", "assignment-ui-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await context.close();
  await local.dispose();
  await db.query(
    'DELETE FROM "Ticket" WHERE "requestId"=$1 AND "reporterId"=$2',
    [requestId, "user-reporter-a"],
  );
  await db.query('DELETE FROM "User" WHERE "id"=$1', [techId]);
  await db.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const { context, page, screenshots, errors } = await openLocalBrowser(
  "tasks-browser-profile",
);
const tag = randomUUID().replaceAll("-", "").slice(0, 20);
const users = ["taskui.a." + tag, "taskui.b." + tag];
const names = ["验收维修员甲", "验收维修员乙"];
const createIds = [];
const payloads = [];
let admin, reporter;
async function create(assigneeId, suffix) {
  const requestId = randomUUID();
  createIds.push(requestId);
  const created = await local.request("/tickets", {
    cookie: reporter,
    method: "POST",
    body: {
      requestId,
      deviceId: "device-ac001",
      title: `空调检修 ${suffix} ${tag}`,
      description: "任务浏览器验收临时记录：设备运行异常，请检查。",
      priority: "urgent",
    },
  });
  assert.equal(created.response.status, 201);
  const assigned = await local.request(
    `/admin/tickets/${created.value.id}/assign`,
    {
      cookie: admin,
      method: "POST",
      body: {
        requestId: randomUUID(),
        assigneeId,
        expectedVersion: 0,
      },
    },
  );
  assert.equal(assigned.response.status, 201);
  return assigned.value;
}
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
async function filter(label, value) {
  await page.getByRole("combobox", { name: "任务状态", exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText(label, { exact: true })
    .click();
  await page.waitForURL(`**/service/tasks?status=${value}`);
}
async function shot(name) {
  await page.keyboard.press("Escape");
  await page
    .locator(".ant-select-dropdown:visible")
    .waitFor({ state: "hidden" });
  await page.locator(".ant-spin-spinning").waitFor({ state: "hidden" });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  await page.screenshot({ path: path.join(screenshots, name), fullPage: true });
}
try {
  for (const [index, id] of users.entries())
    await db.query(
      'INSERT INTO "User" ("id","username","name","role","passwordHash","active") SELECT $1,$1,$2,\'technician\',"passwordHash",true FROM "User" WHERE "id"=$3',
      [id, names[index], "user-technician"],
    );
  admin = await local.login("admin");
  reporter = await local.login("reporter.a");
  const techCookie = await local.login(users[0]);
  const stale = await create(users[0], "状态核对");
  const task = await create(users[0], "现场检查");
  const other = await create(users[1], "电气检查");
  await context.clearCookies();
  await page.goto("http://127.0.0.1:5173/service/tasks", {
    waitUntil: "networkidle",
  });
  await page.waitForURL("**/login");
  await login(users[0]);
  await page
    .getByRole("navigation", { name: "设备服务导航" })
    .getByRole("link", { name: "我的任务", exact: true })
    .click();
  await filter("待接单", "assigned");
  const staleRow = page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: stale.title });
  await staleRow.waitFor();
  assert.equal(await page.getByText(other.title, { exact: true }).count(), 0);
  await page.reload({ waitUntil: "networkidle" });
  await staleRow.waitFor();
  await shot("service-tasks.png");
  await staleRow.getByRole("link", { name: "查看详情", exact: true }).click();
  await page.getByRole("heading", { name: "任务详情", exact: true }).waitFor();
  await page.getByText(stale.title, { exact: true }).waitFor();
  await page.getByRole("button", { name: "接单", exact: true }).click();
  await page.getByRole("dialog", { name: "确认接单", exact: true }).waitFor();
  await page.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "接单", exact: true }).click();
  const acceptedElsewhere = await local.request(`/tasks/${stale.id}/accept`, {
    cookie: techCookie,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: 1,
    },
  });
  assert.equal(acceptedElsewhere.response.status, 201);
  await page.getByRole("button", { name: "确认接单", exact: true }).click();
  await page
    .getByText("任务已变化或已接单，请刷新后查看", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /^刷\s*新$/ }).click();
  await page.getByText("维修人员已接单，正在处理中", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "接单", exact: true }).count(),
    0,
  );
  await page.getByRole("link", { name: "返回我的任务", exact: true }).click();
  await filter("待接单", "assigned");
  const row = page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: task.title });
  await row.waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  const card = page
    .getByRole("list", { name: "维修任务列表", exact: true })
    .getByRole("article")
    .filter({ hasText: task.title });
  await card.waitFor();
  assert.equal(await page.getByRole("table").count(), 0);
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await shot("service-tasks-mobile.png");
  let lost = false;
  await page.route(`**/api/tasks/${task.id}/accept`, async (route) => {
    payloads.push(route.request().postDataJSON());
    if (!lost) {
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      lost = true;
      await route.abort("failed");
    } else await route.continue();
  });
  await card.getByRole("button", { name: "接单", exact: true }).click();
  await page.getByRole("button", { name: "确认接单", exact: true }).click();
  await page
    .getByText("尚未确认接单结果，可重试，或关闭后刷新任务核对。", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "确认接单", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0].requestId, payloads[1].requestId);
  await page.getByText("暂无分派给你的任务", { exact: true }).waitFor();
  await filter("处理中", "processing");
  await card.waitFor();
  assert.equal(
    await page.getByRole("button", { name: "接单", exact: true }).count(),
    0,
  );
  await card.getByRole("link", { name: "查看详情", exact: true }).click();
  await page.getByText("接单时间", { exact: true }).waitFor();
  await page.getByText("维修人员已接单，正在处理中", { exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("接单时间", { exact: true }).waitFor();
  await shot("service-task-detail-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot("service-task-detail.png");
  await logout();
  await login(users[1]);
  await page.goto("http://127.0.0.1:5173/service/tasks", {
    waitUntil: "networkidle",
  });
  await page.getByText(other.title, { exact: true }).waitFor();
  assert.equal(await page.getByText(task.title, { exact: true }).count(), 0);
  assert.equal(await page.getByText(stale.title, { exact: true }).count(), 0);
  await page.goto("http://127.0.0.1:5173/service/tasks/" + task.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("任务不存在或无权访问", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "接单", exact: true }).count(),
    0,
  );
  await logout();
  await login("reporter.a");
  await page.goto("http://127.0.0.1:5173/service/tickets/" + task.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("维修人员已接单，正在处理中", { exact: true }).waitFor();
  await page.getByText("接单时间", { exact: true }).waitFor();
  await page.goto("http://127.0.0.1:5173/service/tasks", {
    waitUntil: "networkidle",
  });
  await page.getByText("当前角色无权访问维修任务", { exact: true }).waitFor();
  await logout();
  const audit = await db.query(
    'SELECT "ticketId",COUNT(*)::int AS count FROM "TicketAcceptance" WHERE "ticketId"=ANY($1::text[]) GROUP BY "ticketId"',
    [[stale.id, task.id]],
  );
  assert.equal(audit.rows.length, 2);
  assert.ok(audit.rows.every((record) => record.count === 1));
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "本人任务筛选、详情、URL 与刷新",
          "桌面表格与 390px 卡片",
          "接单确认与取消",
          "页面状态过期后冲突提示和刷新",
          "响应丢失后沿用提交编号重试",
          "接单后状态、人员与时间可回看",
          "维修人员换账号清理与越权详情拦截",
          "报修用户可看进度且无法访问任务入口",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local/tasks-ui-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await context.close();
  await local.dispose();
  if (createIds.length)
    await db.query(
      'DELETE FROM "Ticket" WHERE "requestId"=ANY($1::uuid[]) AND "reporterId"=$2',
      [createIds, "user-reporter-a"],
    );
  await db.query('DELETE FROM "User" WHERE "id"=ANY($1::text[])', [users]);
  await db.end();
}

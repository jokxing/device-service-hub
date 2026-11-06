import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "confirm.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "confirmations-browser-profile",
);
const tag = Date.now();
const payloads = [];
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
async function shot(file) {
  await page.locator(".ant-spin-spinning").waitFor({ state: "hidden" });
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({ path: path.join(screenshots, file), fullPage: true });
}
try {
  await local.waitForApi();
  const tech = await fixtures.technician("完成验收维修员");
  const { reporter } = await fixtures.identities();
  const ticket = await fixtures.task(tech, {
    stage: "confirming",
    title: "大厅空调维修完成 " + tag,
  });
  const stale = await fixtures.task(tech, {
    stage: "confirming",
    title: "会议室维修完成 " + tag,
  });
  const processing = await fixtures.task(tech, {
    title: "处理中不可确认 " + tag,
  });
  await context.clearCookies();
  await page.goto("http://127.0.0.1:5173/service/tickets/" + ticket.id, {
    waitUntil: "networkidle",
  });
  await page.waitForURL("**/login");
  await login("reporter.a");
  await page.goto("http://127.0.0.1:5173/service/tickets/" + ticket.id, {
    waitUntil: "networkidle",
  });
  await page
    .getByText("处理结果已提交，等待报修用户确认", { exact: true })
    .waitFor();
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "确认维修完成",
    exact: true,
  });
  await dialog.getByText(ticket.result.description, { exact: true }).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(
    (await local.request("/tickets/" + ticket.id, { cookie: reporter })).value
      .status,
    "confirming",
  );
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await dialog.evaluate(async (element) => {
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    await Promise.all(
      element
        .getAnimations()
        .map((animation) => animation.finished.catch(() => {})),
    );
  });
  const bounds = await dialog.boundingBox();
  assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= 391);
  await dialog.screenshot({
    path: path.join(screenshots, "service-confirmation-dialog-mobile.png"),
  });
  let lost = false;
  await page.route(`**/api/tickets/${ticket.id}/confirm`, async (route) => {
    payloads.push(route.request().postDataJSON());
    if (!lost) {
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      lost = true;
      await route.abort("failed");
    } else await route.continue();
  });
  await dialog.getByRole("button", { name: "确认完成", exact: true }).click();
  await dialog
    .getByText("尚未确认操作结果，可重试，或关闭后刷新报修记录核对。", {
      exact: true,
    })
    .waitFor();
  await dialog.getByRole("button", { name: "确认完成", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByText("报修用户已确认完成，工单已结束", { exact: true })
    .waitFor();
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0].requestId, payloads[1].requestId);
  assert.equal(payloads[0].expectedVersion, 3);
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("确认时间", { exact: true }).waitFor();
  await page.getByText(ticket.result.description, { exact: true }).waitFor();
  await shot("service-completed-ticket-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot("service-completed-ticket.png");
  await page.getByRole("link", { name: "返回我的报修", exact: true }).click();
  const ownRow = page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: ticket.title });
  await ownRow.getByText("已完成", { exact: true }).waitFor();

  await page.goto("http://127.0.0.1:5173/service/tickets/" + stale.id, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
  const elsewhere = await local.request(`/tickets/${stale.id}/confirm`, {
    cookie: reporter,
    method: "POST",
    body: { requestId: randomUUID(), expectedVersion: 3 },
  });
  assert.equal(elsewhere.response.status, 201);
  await dialog.getByRole("button", { name: "确认完成", exact: true }).click();
  await dialog
    .getByText("工单已变化或不满足确认条件，请刷新后查看", { exact: true })
    .waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /^刷\s*新$/ }).click();
  await page.getByText("确认时间", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  await page.goto("http://127.0.0.1:5173/service/tickets/" + processing.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("维修人员已接单，正在处理中", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  await logout();

  await login("admin");
  await page.goto(
    "http://127.0.0.1:5173/service/admin/tickets?status=completed",
    { waitUntil: "networkidle" },
  );
  const adminRow = page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: ticket.title });
  await adminRow.getByRole("button", { name: /^详\s*情$/ }).click();
  await page.getByText("确认时间", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await logout();
  await login(tech.id);
  await page.goto("http://127.0.0.1:5173/service/tasks/" + ticket.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("确认时间", { exact: true }).waitFor();
  for (const name of ["确认完成", "接单", "提交处理结果"])
    assert.equal(
      await page.getByRole("button", { name, exact: true }).count(),
      0,
    );
  await logout();
  await login("reporter.b");
  await page.goto("http://127.0.0.1:5173/service/tickets/" + ticket.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("报修记录不存在或无权访问", { exact: true }).waitFor();
  assert.equal(
    await page.getByText(ticket.result.description, { exact: true }).count(),
    0,
  );
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  await logout();
  const audit = await db.query(
    'SELECT "ticketId",COUNT(*)::int AS count FROM "TicketConfirmation" WHERE "ticketId"=ANY($1::text[]) GROUP BY "ticketId"',
    [[ticket.id, stale.id]],
  );
  assert.equal(audit.rows.length, 2);
  assert.ok(audit.rows.every((row) => row.count === 1));
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "本人确认入口与取消不改变状态",
          "手机确认框展示处理结果",
          "响应丢失后相同意图重试只写一次",
          "完成状态、确认人和时间刷新保留",
          "过期页面冲突与刷新恢复",
          "处理中不显示确认入口",
          "管理员与维修人员只读完成记录",
          "跨报修用户隔离与会话页面清理",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local/confirmations-ui-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

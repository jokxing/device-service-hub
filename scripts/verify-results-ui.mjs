import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "result.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "results-browser-profile",
);
const tag = Date.now();
const description =
  "故障原因：滤网堵塞，送风量不足。\n处理措施：清理滤网，检查接线与制冷回路。\n检查结果：连续试运行 30 分钟，制冷与出风恢复正常。";
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
  const technician = await fixtures.technician("结果验收维修员");
  const other = await fixtures.technician("另一维修员");
  const task = await fixtures.task(technician, {
    title: "大厅空调检修 " + tag,
  });
  const stale = await fixtures.task(technician, {
    title: "会议室空调检修 " + tag,
  });
  await context.clearCookies();
  await page.goto("http://127.0.0.1:5173/service/tasks/" + task.id, {
    waitUntil: "networkidle",
  });
  await page.waitForURL("**/login");
  await login(technician.id);
  await page.goto("http://127.0.0.1:5173/service/tasks/" + task.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("维修人员已接单，正在处理中", { exact: true }).waitFor();
  await page.getByRole("button", { name: "提交处理结果", exact: true }).click();
  const field = page.getByRole("textbox", { name: "处理说明", exact: true });
  await field.fill("未提交的临时说明");
  await page.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "提交处理结果", exact: true }).click();
  assert.equal(await field.inputValue(), "");
  await field.fill("   ");
  await page.getByRole("button", { name: "提交待确认", exact: true }).click();
  await page.getByText("请填写处理说明", { exact: true }).waitFor();
  await field.fill("  " + description + "  ");
  await page
    .getByText("请填写处理说明", { exact: true })
    .waitFor({ state: "hidden" });
  await page.setViewportSize({ width: 390, height: 844 });
  const dialog = page.getByRole("dialog", {
    name: "提交处理结果",
    exact: true,
  });
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
    path: path.join(screenshots, "service-task-result-form-mobile.png"),
  });
  let lost = false;
  await page.route(`**/api/tasks/${task.id}/result`, async (route) => {
    payloads.push(route.request().postDataJSON());
    if (!lost) {
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      lost = true;
      await route.abort("failed");
    } else await route.continue();
  });
  await page.getByRole("button", { name: "提交待确认", exact: true }).click();
  await page
    .getByText("尚未确认提交结果，可重试相同说明，或关闭后刷新任务核对。", {
      exact: true,
    })
    .waitFor();
  await page.getByRole("button", { name: "提交待确认", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  await page
    .getByText("处理结果已提交，等待报修用户确认", { exact: true })
    .waitFor();
  await page.getByText(description, { exact: true }).waitFor();
  assert.equal(payloads.length, 2);
  assert.equal(payloads[0].requestId, payloads[1].requestId);
  assert.equal(payloads[0].description, description);
  assert.equal(
    await page
      .getByRole("button", { name: "提交处理结果", exact: true })
      .count(),
    0,
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("处理提交时间", { exact: true }).waitFor();
  await page.getByText(description, { exact: true }).waitFor();
  await shot("service-task-result-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot("service-task-result.png");

  await page.goto("http://127.0.0.1:5173/service/tasks/" + stale.id, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "提交处理结果", exact: true }).click();
  await field.fill("页面尚未刷新时填写的说明");
  const submittedElsewhere = await local.request(`/tasks/${stale.id}/result`, {
    cookie: technician.cookie,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: 2,
      description: "另一窗口已提交的处理结果",
    },
  });
  assert.equal(submittedElsewhere.response.status, 201);
  await page.getByRole("button", { name: "提交待确认", exact: true }).click();
  await page
    .getByText("任务已变化或结果已提交，请刷新后查看", { exact: true })
    .waitFor();
  assert.equal(await field.inputValue(), "页面尚未刷新时填写的说明");
  await page.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: /^刷\s*新$/ }).click();
  await page.getByText("另一窗口已提交的处理结果", { exact: true }).waitFor();
  await page.getByRole("link", { name: "返回我的任务", exact: true }).click();
  await page.getByRole("combobox", { name: "任务状态", exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("待确认", { exact: true })
    .click();
  await page.waitForURL("**/service/tasks?status=confirming");
  const row = page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: task.title });
  await row.waitFor();
  await row.getByText("待确认", { exact: true }).waitFor();
  await logout();

  await login("admin");
  await page.goto(
    "http://127.0.0.1:5173/service/admin/tickets?status=confirming",
    { waitUntil: "networkidle" },
  );
  const adminRow = page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: task.title });
  await adminRow.getByRole("button", { name: /^详\s*情$/ }).click();
  await page.getByText(description, { exact: true }).waitFor();
  await page.getByRole("button", { name: "关闭", exact: true }).click();
  await page.getByRole("dialog").waitFor({ state: "hidden" });
  await logout();
  await login("reporter.a");
  await page.goto("http://127.0.0.1:5173/service/tickets/" + task.id, {
    waitUntil: "networkidle",
  });
  await page.getByText(description, { exact: true }).waitFor();
  await page.getByText("处理提交时间", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "提交处理结果", exact: true })
      .count(),
    0,
  );
  await logout();
  await login("reporter.b");
  await page.goto("http://127.0.0.1:5173/service/tickets/" + task.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("报修记录不存在或无权访问", { exact: true }).waitFor();
  assert.equal(await page.getByText(description, { exact: true }).count(), 0);
  await logout();
  await login(other.id);
  await page.goto("http://127.0.0.1:5173/service/tasks/" + task.id, {
    waitUntil: "networkidle",
  });
  await page.getByText("任务不存在或无权访问", { exact: true }).waitFor();
  assert.equal(await page.getByText(description, { exact: true }).count(), 0);
  await logout();
  const audit = await db.query(
    'SELECT "ticketId",COUNT(*)::int AS count FROM "TicketResult" WHERE "ticketId"=ANY($1::text[]) GROUP BY "ticketId"',
    [[task.id, stale.id]],
  );
  assert.equal(audit.rows.length, 2);
  assert.ok(audit.rows.every((record) => record.count === 1));
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "取消后清理表单与空白说明校验",
          "窄屏表单与多行结果展示",
          "响应丢失后相同说明重试只写一次",
          "刷新后待确认状态、结果、人员和时间保留",
          "状态过期冲突保留表单且不覆盖原结果",
          "任务筛选与三角色一致展示",
          "跨维修人员和跨报修用户隔离",
        ],
        screenshots,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local/results-ui-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

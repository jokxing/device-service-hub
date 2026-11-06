import assert from "node:assert/strict";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "shared.ui");
const { context, page, errors } = await openLocalBrowser(
  "shared-ui-browser-profile",
);
const createIds = new Set();
const heldRequests = [];
const origin = "http://127.0.0.1:5173";
const title = "公共交互验收 " + Date.now();
page.on("request", (request) => {
  if (
    request.method() === "POST" &&
    new URL(request.url()).pathname === "/api/tickets"
  )
    createIds.add(request.postDataJSON().requestId);
});

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
async function hold(url, abort = false) {
  let releaseGate, notifyStart, notifyFinish;
  const gate = new Promise((resolve) => {
    releaseGate = resolve;
  });
  const started = new Promise((resolve) => {
    notifyStart = resolve;
  });
  const finished = new Promise((resolve) => {
    notifyFinish = resolve;
  });
  let count = 0;
  const handler = async (route) => {
    count++;
    notifyStart();
    await gate;
    try {
      if (abort) await route.abort("aborted");
      else await route.continue();
    } catch (error) {
      if (!route.request().failure()) throw error;
    } finally {
      notifyFinish();
    }
  };
  await page.route(url, handler);
  const result = {
    started,
    count: () => count,
    release: async () => {
      releaseGate();
      await finished;
      await page.unroute(url, handler);
    },
    cancel: releaseGate,
  };
  heldRequests.push(result);
  return result;
}
async function assertLocked(dialog, okText, request) {
  await request.started;
  await page.evaluate(() => new Promise(requestAnimationFrame));
  const submit = dialog.getByRole("button", { name: okText, exact: true });
  assert.equal(await submit.isDisabled(), true);
  assert.equal(
    await dialog.getByRole("button", { name: /^取\s*消$/ }).isDisabled(),
    true,
  );
  assert.equal(
    await dialog.getByRole("button", { name: "关闭", exact: true }).count(),
    0,
  );
  await page.keyboard.press("Escape");
  assert.equal(
    await dialog.isVisible(),
    true,
    "Escape must not dismiss a submitting modal",
  );
  await page.mouse.click(5, 5);
  assert.equal(
    await dialog.isVisible(),
    true,
    "Mask click must not dismiss a submitting modal",
  );
  await submit.evaluate((button) => {
    button.click();
    button.click();
  });
  assert.equal(
    request.count(),
    1,
    "Repeated clicks do not start another request",
  );
}
async function openRepair(suffix) {
  await page.getByRole("button", { name: /^报\s*修$/ }).click();
  const dialog = page.getByRole("dialog", {
    name: "提交设备报修",
    exact: true,
  });
  await dialog.getByRole("textbox", { name: "问题标题" }).fill(title + suffix);
  await dialog
    .getByRole("textbox", { name: "问题描述" })
    .fill("仅本轮临时交互验收，结束后定向清理。");
  return dialog;
}
async function taskFilter(label) {
  await page.getByRole("combobox", { name: "任务状态", exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText(label, { exact: true })
    .click();
}

try {
  await local.waitForApi();
  const tech = await fixtures.technician("公共交互维修员");
  await context.clearCookies();
  await page.goto(origin + "/service/devices", { waitUntil: "networkidle" });
  await page.waitForURL("**/login");
  await login("reporter.a");
  let dialog = await openRepair("闭环");
  let request = await hold("**/api/tickets");
  const createdResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith("/api/tickets") &&
      response.request().method() === "POST",
  );
  await dialog.getByRole("button", { name: "提交报修", exact: true }).click();
  await assertLocked(dialog, "提交报修", request);
  await request.release();
  const created = await (await createdResponse).json();
  await page.waitForURL("**/service/tickets/" + created.id);
  await logout();

  await login("admin");
  await page.goto(origin + "/service/admin/tickets?status=pending", {
    waitUntil: "networkidle",
  });
  const row = page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: created.title });
  await row.getByRole("button", { name: /^分\s*派$/ }).click();
  dialog = page.getByRole("dialog", { name: "分派维修人员", exact: true });
  await dialog.getByRole("combobox", { name: "维修人员", exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText(tech.name, { exact: true })
    .click();
  request = await hold(`**/api/admin/tickets/${created.id}/assign`);
  await dialog.getByRole("button", { name: "确认分派", exact: true }).click();
  await assertLocked(dialog, "确认分派", request);
  await request.release();
  await dialog.waitFor({ state: "hidden" });
  await logout();

  await login(tech.id);
  await page.goto(origin + "/service/tasks/" + created.id, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "接单", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "确认接单", exact: true });
  request = await hold(`**/api/tasks/${created.id}/accept`);
  await dialog.getByRole("button", { name: "确认接单", exact: true }).click();
  await assertLocked(dialog, "确认接单", request);
  await request.release();
  await page.getByText("维修人员已接单，正在处理中", { exact: true }).waitFor();
  await page.getByRole("button", { name: "提交处理结果", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "提交处理结果", exact: true });
  await dialog
    .getByRole("textbox", { name: "处理说明", exact: true })
    .fill("已清理滤网并复测，设备运行正常。");
  request = await hold(`**/api/tasks/${created.id}/result`);
  await dialog.getByRole("button", { name: "提交待确认", exact: true }).click();
  await assertLocked(dialog, "提交待确认", request);
  await request.release();
  await page
    .getByText("处理结果已提交，等待报修用户确认", { exact: true })
    .waitFor();
  await logout();

  await login("reporter.a");
  await page.goto(origin + "/service/tickets/" + created.id, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "确认维修完成", exact: true });
  request = await hold(`**/api/tickets/${created.id}/confirm`);
  await dialog.getByRole("button", { name: "确认完成", exact: true }).click();
  await assertLocked(dialog, "确认完成", request);
  await request.release();
  await page
    .getByText("报修用户已确认完成，工单已结束", { exact: true })
    .waitFor();

  // A real expired session must clear the cached identity on a mutation's 401.
  await page.goto(origin + "/service/devices", { waitUntil: "networkidle" });
  dialog = await openRepair("过期会话");
  const revoked = await context.request.post(origin + "/api/auth/logout", {
    headers: { Origin: origin },
  });
  assert.equal(revoked.status(), 204);
  await dialog.getByRole("button", { name: "提交报修", exact: true }).click();
  await page.waitForURL("**/login");
  await login("reporter.a");

  // Keep this request away from the server to test the real 15-second timeout.
  dialog = await openRepair("超时");
  request = await hold("**/api/tickets", true);
  await dialog.getByRole("button", { name: "提交报修", exact: true }).click();
  await assertLocked(dialog, "提交报修", request);
  await dialog
    .getByText("尚未确认提交结果，可重试相同内容，或先查看我的报修。", {
      exact: true,
    })
    .waitFor({ timeout: 20000 });
  assert.equal(
    await dialog
      .getByRole("button", { name: "提交报修", exact: true })
      .isDisabled(),
    false,
  );
  await request.release();
  await page.keyboard.press("Escape");
  await dialog.waitFor({ state: "hidden" });

  // Browser Back unmounts a submitting component and must abort its read/write handle.
  await page
    .getByRole("navigation", { name: "设备服务导航" })
    .getByRole("link", { name: "我的报修", exact: true })
    .click();
  await page.waitForURL("**/service/tickets");
  await page
    .getByRole("navigation", { name: "设备服务导航" })
    .getByRole("link", { name: "设备台账", exact: true })
    .click();
  dialog = await openRepair("离页");
  request = await hold("**/api/tickets", true);
  await dialog.getByRole("button", { name: "提交报修", exact: true }).click();
  await request.started;
  const failed = page.waitForEvent("requestfailed", {
    predicate: (item) =>
      item.method() === "POST" && item.url().endsWith("/api/tickets"),
  });
  await page.goBack();
  await page.waitForURL("**/service/tickets");
  await failed;
  await request.release();
  assert.equal(await page.getByRole("dialog").count(), 0);
  await logout();

  // Populate a real second page for the new URL hook and responsive list shell.
  for (let i = 0; i < 11; i++)
    await fixtures.task(tech, {
      stage: "assigned",
      title: `${title}分页 ${i}`,
    });
  await login(tech.id);
  await page.goto(origin + "/service/tasks", { waitUntil: "networkidle" });
  await page.locator(".ant-pagination-item-2").click();
  await page.waitForURL("**/service/tasks?page=2");
  await taskFilter("待接单");
  await page.waitForURL("**/service/tasks?status=assigned");
  await page.locator(".ant-pagination-item-2").click();
  await page.waitForURL("**/service/tasks?status=assigned&page=2");
  await page.reload({ waitUntil: "networkidle" });
  await page.locator("tbody tr.ant-table-row").waitFor();
  await page.goBack();
  await page.waitForURL("**/service/tasks?status=assigned");
  await page.goForward();
  await page.waitForURL("**/service/tasks?status=assigned&page=2");
  await page.setViewportSize({ width: 390, height: 844 });
  const cards = page.getByRole("list", { name: "维修任务列表", exact: true });
  await cards.waitFor();
  assert.equal(await page.getByRole("table").count(), 0);
  assert.equal(await cards.getByRole("article").count(), 1);
  assert.equal(
    await page.locator(".ant-pagination-simple-pager input").inputValue(),
    "2",
  );
  await page.locator(".ant-pagination-prev").click();
  await page.waitForURL("**/service/tasks?status=assigned");
  await page.getByText("共 11 条任务", { exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await logout();
  await login("admin");
  await page.goto(origin + "/service/admin/tickets?status=assigned", {
    waitUntil: "networkidle",
  });
  await page.locator(".ant-pagination-item-2").click();
  await page.waitForURL("**/service/admin/tickets?status=assigned&page=2");
  await page.getByRole("combobox", { name: "工单状态", exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText("处理中", { exact: true })
    .click();
  await page.waitForURL("**/service/admin/tickets?status=processing");
  await logout();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "五个真实提交弹窗统一阻止 Esc、遮罩、取消与重复点击",
          "闭环请求成功后正常关闭与刷新",
          "变更请求 401 清理会话",
          "实际 15 秒超时恢复可操作状态",
          "浏览器后退卸载时取消请求",
          "真实第二页的筛选重置、刷新与前进后退",
          "移动简单分页与桌面表格共享 URL 状态",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local/shared-ui-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  for (const request of heldRequests) request.cancel();
  await context.request
    .post(origin + "/api/auth/logout", { headers: { Origin: origin } })
    .catch(() => {});
  await context.close();
  if (createIds.size)
    await db.query(
      'DELETE FROM "Ticket" WHERE "requestId"=ANY($1::uuid[]) AND "reporterId"=$2',
      [[...createIds], "user-reporter-a"],
    );
  await fixtures.cleanup();
  await db.end();
}

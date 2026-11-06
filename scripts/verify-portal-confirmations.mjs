import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "portal.confirm");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "portal-confirmations-browser-profile",
);
const origin = "http://127.0.0.1:3000";
const sent = [];
let release;
const gate = new Promise((resolve) => {
  release = resolve;
});
let notify;
const started = new Promise((resolve) => {
  notify = resolve;
});
async function login(username) {
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL(origin + "/devices");
  await page.getByRole("heading", { name: "我的设备", exact: true }).waitFor();
}
async function logout() {
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL(origin + "/login");
  await page.getByRole("textbox", { name: "账号", exact: true }).waitFor();
}
async function post(id, body, status, suppliedOrigin = origin) {
  const response = await context.request.post(
    `${origin}/api/tickets/${id}/confirm`,
    { headers: suppliedOrigin ? { Origin: suppliedOrigin } : {}, data: body },
  );
  assert.equal(response.status(), status);
  return response;
}
async function visit(ticket) {
  await page.goto(origin + "/tickets/" + ticket.id, {
    waitUntil: "networkidle",
  });
}
async function screenshot(file) {
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
  const tech = await fixtures.technician("门户验收维修员");
  const { reporter, admin } = await fixtures.identities();
  const ticket = await fixtures.task(tech, {
    stage: "confirming",
    title: "大厅空调维修完成",
  });
  const stale = await fixtures.task(tech, {
    stage: "confirming",
    title: "会议室空调维修完成",
  });
  const processing = await fixtures.task(tech, {
    stage: "processing",
    title: "处理中任务不可确认",
  });
  const expired = await fixtures.task(tech, {
    stage: "confirming",
    title: "会话失效不得确认",
  });
  await context.clearCookies();
  const command = { requestId: randomUUID(), expectedVersion: 3 };
  await post(ticket.id, command, 401);
  await visit(ticket);
  await page.waitForURL(origin + "/login");
  await login("reporter.a");
  await post(ticket.id, command, 403, "https://untrusted.invalid");
  await post(ticket.id, command, 403, null);
  await post(
    ticket.id,
    { ...command, reporterId: "user-admin", status: "completed" },
    400,
  );
  await post(ticket.id, { ...command, expectedVersion: 0 }, 409);
  await post("unknown-ticket", command, 400);
  await post(randomUUID(), command, 404);
  await post(processing.id, { ...command, expectedVersion: 2 }, 409);
  await visit(ticket);
  await page
    .getByText("处理结果已提交，请核对后确认完成", { exact: true })
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
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
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
    path: path.join(screenshots, "portal-confirmation-dialog-mobile.png"),
  });
  await page.route(`**/api/tickets/${ticket.id}/confirm`, async (route) => {
    sent.push(route.request().postDataJSON());
    if (sent.length === 1) {
      notify();
      await gate;
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      await route.abort("failed");
    } else {
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      await route.fulfill({ response });
    }
  });
  const submit = dialog.getByRole("button", { name: "确认完成", exact: true });
  await submit.click();
  await started;
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
  assert.equal(await dialog.isVisible(), true);
  await page.mouse.click(5, 5);
  assert.equal(await dialog.isVisible(), true);
  await submit.evaluate((button) => {
    button.click();
    button.click();
  });
  assert.equal(sent.length, 1);
  release();
  await dialog
    .getByText("尚未确认操作结果，可重试，或关闭后刷新报修记录核对。", {
      exact: true,
    })
    .waitFor();
  await submit.click();
  await page
    .getByText("报修用户已确认完成，工单已结束", { exact: true })
    .waitFor();
  assert.equal(sent.length, 2);
  assert.equal(sent[0].requestId, sent[1].requestId);
  assert.equal(sent[0].expectedVersion, 3);
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  await page.unroute(`**/api/tickets/${ticket.id}/confirm`);
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("确认时间", { exact: true }).waitFor();
  await screenshot("portal-completed-ticket-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await screenshot("portal-completed-ticket.png");
  const completed = await local.request("/tickets/" + ticket.id, {
    cookie: reporter,
  });
  assert.equal(completed.value.version, 4);
  assert.equal(completed.value.confirmation.actor.id, "user-reporter-a");
  assert.equal(completed.value.result.description, ticket.result.description);
  const records = await db.query(
    'SELECT COUNT(*)::int AS "count" FROM "TicketConfirmation" WHERE "ticketId"=$1',
    [ticket.id],
  );
  assert.equal(records.rows[0].count, 1);
  const html = await context.request.get(origin + "/tickets/" + ticket.id);
  assert.ok(html.headers()["cache-control"].includes("no-store"));
  assert.ok((await html.text()).includes("报修用户已确认完成"));
  await page
    .getByRole("navigation", { name: "门户导航", exact: true })
    .getByRole("link", { name: "我的报修", exact: true })
    .click();
  await page
    .getByRole("article")
    .filter({ hasText: ticket.code })
    .getByText("已完成", { exact: true })
    .waitFor();

  await visit(stale);
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
  const changed = await local.request(`/tickets/${stale.id}/confirm`, {
    cookie: reporter,
    method: "POST",
    body: { requestId: randomUUID(), expectedVersion: 3 },
  });
  assert.equal(changed.response.status, 201);
  await dialog.getByRole("button", { name: "确认完成", exact: true }).click();
  await dialog
    .getByText("工单已变化或不满足确认条件，请刷新后查看", { exact: true })
    .waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "刷新进度", exact: true }).click();
  await page
    .getByText("报修用户已确认完成，工单已结束", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  await visit(processing);
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );

  await visit(expired);
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
  const revoked = await context.request.post(origin + "/api/auth/logout", {
    headers: { Origin: origin },
  });
  assert.equal(revoked.status(), 204);
  await dialog.getByRole("button", { name: "确认完成", exact: true }).click();
  await page.waitForURL(origin + "/login");
  assert.equal(
    (await local.request("/tickets/" + expired.id, { cookie: reporter })).value
      .status,
    "confirming",
  );
  await login("reporter.b");
  await post(ticket.id, sent[0], 404);
  await visit(ticket);
  await page
    .getByRole("heading", { name: "未找到可访问的页面", exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  await page.goto(origin + "/devices", { waitUntil: "networkidle" });
  await logout();
  // Even a valid backend session for another role must not pass the portal adapter.
  for (const cookie of [admin, tech.cookie]) {
    await context.addCookies([
      {
        name: "dsh_portal_session",
        value: cookie.split("=")[1],
        url: origin,
        httpOnly: true,
        sameSite: "Strict",
      },
    ]);
    await post(expired.id, command, 403);
    await context.clearCookies();
  }
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "本人待确认入口与处理说明，取消不修改状态",
          "提交中禁止取消、Esc、遮罩关闭与重复点击",
          "成功响应丢失后同编号重试只写一条确认，版本仅递增一次",
          "SSR 完成详情、列表、刷新及手机确认框",
          "过期页面冲突与刷新恢复，处理中不显示入口",
          "来源、字段、版本、跨用户/跨角色与会话失效拦截",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local/portal-confirmations-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  release();
  await context.request
    .post(origin + "/api/auth/logout", { headers: { Origin: origin } })
    .catch(() => {});
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

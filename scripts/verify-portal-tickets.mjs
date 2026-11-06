import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const { context, page, screenshots, errors } = await openLocalBrowser(
  "portal-tickets-browser-profile",
);
const origin = "http://127.0.0.1:3000";
const fixtureId = "portal-repair-" + randomUUID();
const username = "portal." + randomUUID().replaceAll("-", "");
const disabledId = "portal-device-" + randomUUID();
const requestIds = new Set();
const sent = [];
let created;
let release;
const gate = new Promise((resolve) => {
  release = resolve;
});
let started;
const waiting = new Promise((resolve) => {
  started = resolve;
});
async function login(account) {
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(account);
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
async function post(body, expected, suppliedOrigin = origin) {
  if (body.requestId) requestIds.add(body.requestId);
  const response = await context.request.post(origin + "/api/tickets", {
    headers: suppliedOrigin ? { Origin: suppliedOrigin } : {},
    data: body,
  });
  assert.equal(response.status(), expected);
  return response;
}
const payload = (overrides = {}) => ({
  requestId: randomUUID(),
  deviceId: "device-ac001",
  title: "空调制冷异常",
  description: "空调运行但不制冷，请安排检查。",
  priority: "normal",
  ...overrides,
});
try {
  await local.waitForApi();
  await db.query(
    'INSERT INTO "User" ("id","username","name","role","passwordHash","active") SELECT $1,$2,$3,\'reporter\',"passwordHash",true FROM "User" WHERE "id"=\'user-reporter-a\'',
    [fixtureId, username, "报修用户验收"],
  );
  await db.query(
    'INSERT INTO "DeviceAccess" ("userId","deviceId") VALUES ($1,\'device-ac001\')',
    [fixtureId],
  );
  await context.clearCookies();
  await post(payload(), 401);
  await page.goto(origin + "/devices/device-ac001/repair", {
    waitUntil: "networkidle",
  });
  await page.waitForURL(origin + "/login");
  await login(username);
  await page.getByRole("link", { name: "查看设备详情 →", exact: true }).click();
  await page.getByRole("link", { name: "发起报修", exact: true }).click();
  await page.getByRole("heading", { name: "提交报修", exact: true }).waitFor();
  await page
    .getByRole("textbox", { name: "问题标题", exact: true })
    .fill("   ");
  await page.getByRole("button", { name: "提交报修", exact: true }).click();
  await page.getByText("请填写问题标题", { exact: true }).waitFor();
  await page
    .getByRole("textbox", { name: "问题标题", exact: true })
    .fill("  空调制冷异常  ");
  await page
    .getByRole("textbox", { name: "问题描述", exact: true })
    .fill("  空调运行但不制冷。\n请安排检查。  ");
  await page
    .getByText("请填写问题标题", { exact: true })
    .waitFor({ state: "hidden" });
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "portal-repair-mobile.png"),
    fullPage: true,
  });
  await page.route("**/api/tickets", async (route) => {
    const body = route.request().postDataJSON();
    sent.push(body);
    requestIds.add(body.requestId);
    if (sent.length === 1) {
      started();
      await gate;
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      created = await response.json();
      await route.abort("failed");
    } else {
      const response = await route.fetch();
      assert.equal(response.status(), 200);
      await route.fulfill({ response });
    }
  });
  await page.getByRole("button", { name: "提交报修", exact: true }).click();
  await waiting;
  const submit = page.getByRole("button", { name: "提交报修", exact: true });
  assert.equal(await submit.isDisabled(), true);
  assert.equal(
    await page
      .getByRole("textbox", { name: "问题标题", exact: true })
      .isDisabled(),
    true,
  );
  await submit.evaluate((button) => {
    button.click();
    button.click();
  });
  assert.equal(sent.length, 1);
  release();
  await page
    .getByText("尚未确认提交结果，请重试相同内容或查看我的报修", {
      exact: true,
    })
    .waitFor();
  assert.equal(await submit.isDisabled(), false);
  await submit.click();
  await page.waitForURL(origin + "/tickets/" + created.id);
  await page.getByText("报修已提交，等待管理员分派", { exact: true }).waitFor();
  await page.unroute("**/api/tickets");
  assert.equal(sent[0].requestId, sent[1].requestId);
  assert.equal(sent[0].title, "空调制冷异常");
  const stored = await db.query(
    'SELECT "id" FROM "Ticket" WHERE "reporterId"=$1 AND "requestId"=$2',
    [fixtureId, sent[0].requestId],
  );
  assert.equal(stored.rowCount, 1);
  assert.equal(created.status, "pending");
  await page.reload({ waitUntil: "networkidle" });
  await page.getByRole("heading", { name: "报修详情", exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "portal-ticket-mobile.png"),
    fullPage: true,
  });
  const ssr = await context.request.get(origin + "/tickets/" + created.id);
  assert.ok(ssr.headers()["cache-control"].includes("no-store"));
  assert.ok((await ssr.text()).includes(created.code));
  await page.setViewportSize({ width: 1440, height: 1100 });
  await page.screenshot({
    path: path.join(screenshots, "portal-ticket-detail.png"),
    fullPage: true,
  });

  await post({ ...sent[0], title: "改内容不得覆盖原单" }, 409);
  await post(payload({ reporterId: "user-admin", status: "completed" }), 400);
  await post(payload({ deviceId: "device-wp002" }), 404);
  await post(payload(), 403, "https://untrusted.invalid");
  await post(payload(), 403, null);
  await db.query(
    'INSERT INTO "Device" ("id","code","name","category","location","model","enabled") VALUES ($1,$2,\'停用设备验收\',\'空调设备\',\'验收区域\',\'TEST\',false)',
    [disabledId, "PT-" + randomUUID()],
  );
  await db.query(
    'INSERT INTO "DeviceAccess" ("userId","deviceId") VALUES ($1,$2)',
    [fixtureId, disabledId],
  );
  await post(payload({ deviceId: disabledId }), 409);
  await page.goto(origin + "/devices/" + disabledId + "/repair", {
    waitUntil: "networkidle",
  });
  await page
    .getByText("设备已停用，暂时无法发起新报修。", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "提交报修", exact: true }).count(),
    0,
  );

  for (let index = 0; index < 10; index++)
    await post(payload({ title: "设备巡检报修 " + (index + 1) }), 201);
  await page.goto(origin + "/tickets", { waitUntil: "networkidle" });
  await page.screenshot({
    path: path.join(screenshots, "portal-my-tickets.png"),
    fullPage: true,
  });
  await page.getByRole("link", { name: "下一页", exact: true }).click();
  await page.waitForURL(origin + "/tickets?page=2");
  await page.getByText("第 2 / 2 页", { exact: true }).waitFor();
  await page.reload({ waitUntil: "networkidle" });
  assert.equal(await page.getByRole("article").count(), 1);
  await page.goBack();
  await page.getByText("第 1 / 2 页", { exact: true }).waitFor();
  await page.goForward();
  await page.getByText("第 2 / 2 页", { exact: true }).waitFor();
  await page.goto(origin + "/tickets?page=999", { waitUntil: "networkidle" });
  await page.waitForURL(origin + "/tickets?page=2");
  await page.goto(origin + "/tickets?page=-1", { waitUntil: "networkidle" });
  await page.getByText("第 1 / 2 页", { exact: true }).waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    true,
  );
  await page.screenshot({
    path: path.join(screenshots, "portal-my-tickets-mobile.png"),
    fullPage: true,
  });

  // Revoke the current session while the form remains open; mutation 401 must leave it.
  await page.goto(origin + "/devices/device-ac001/repair", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("textbox", { name: "问题标题", exact: true })
    .fill("过期会话不得提交");
  await page
    .getByRole("textbox", { name: "问题描述", exact: true })
    .fill("本轮异常验证");
  const revoked = await context.request.post(origin + "/api/auth/logout", {
    headers: { Origin: origin },
  });
  assert.equal(revoked.status(), 204);
  await page.getByRole("button", { name: "提交报修", exact: true }).click();
  await page.waitForURL(origin + "/login");
  await login("reporter.b");
  await page.goto(origin + "/tickets", { waitUntil: "networkidle" });
  assert.equal(await page.getByText(created.code, { exact: true }).count(), 0);
  await page.goto(origin + "/tickets/" + created.id, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "未找到可访问的页面", exact: true })
    .waitFor();
  assert.equal(await page.getByText(created.code, { exact: true }).count(), 0);
  await page.goto(origin + "/devices/device-ac001/repair", {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("heading", { name: "未找到可访问的页面", exact: true })
    .waitFor();
  await page.goto(origin + "/devices", { waitUntil: "networkidle" });
  await logout();
  assert.deepEqual(errors, []);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "真实报修与字段校验、提交中禁用与重复点击防护",
          "响应丢失后相同编号重试仅创建一单，保留 201/200 语义",
          "服务端本人列表/详情、刷新及手机布局",
          "真实第二页、前进后退、非法页码与越界恢复",
          "来源、伪造身份、未授权/停用设备服务端拒绝",
          "提交时会话失效跳转与跨用户详情隔离",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  await page.screenshot({
    path: path.join(local.root, ".local/portal-tickets-failure.png"),
    fullPage: true,
  });
  throw error;
} finally {
  release();
  await context.request
    .post(origin + "/api/auth/logout", { headers: { Origin: origin } })
    .catch(() => {});
  await context.close();
  if (requestIds.size)
    await db.query(
      'DELETE FROM "Ticket" WHERE "reporterId"=$1 AND "requestId"=ANY($2::uuid[])',
      [fixtureId, [...requestIds]],
    );
  await db.query('DELETE FROM "DeviceAccess" WHERE "userId"=$1', [fixtureId]);
  await db.query('DELETE FROM "Device" WHERE "id"=$1', [disabledId]);
  await db.query('DELETE FROM "User" WHERE "id"=$1', [fixtureId]);
  await db.end();
}

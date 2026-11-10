import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "order.fulfill.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "order-fulfillment-profile",
);
const web = "http://127.0.0.1:5173",
  portal = "http://127.0.0.1:3000",
  tokens = new Set();
const commands = [],
  decisions = [];
let release, notify, confirmRelease, confirmNotify;
const gate = new Promise((r) => (release = r)),
  started = new Promise((r) => (notify = r)),
  confirmGate = new Promise((r) => (confirmRelease = r)),
  confirmStarted = new Promise((r) => (confirmNotify = r));
const dialog = page.getByRole("dialog");
const visit = (v) =>
  page.goto(web + "/service/tasks/" + v.ticket.id, {
    waitUntil: "networkidle",
  });
const order = () => page.getByLabel("服务订单", { exact: true });
async function auth(cookie) {
  await context.clearCookies();
  await context.addCookies([
    {
      name: "dsh_session",
      value: cookie.split(";")[0].slice("dsh_session=".length),
      domain: "127.0.0.1",
      path: "/api",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
}
async function opened(tech, title) {
  const v = await fixtures.orderedTask(tech, { title });
  const r = await local.request(`/orders/${v.order.id}/start`, {
    cookie: tech.cookie,
    method: "POST",
    body: { requestId: randomUUID(), expectedVersion: 4 },
  });
  assert.equal(r.response.status, 201);
  return v;
}
const input = (description = "另一窗口的处理结果") => ({
  requestId: randomUUID(),
  expectedVersion: 5,
  description,
});
const result = (tech, v, body = input()) =>
  local.request(`/tasks/${v.ticket.id}/result`, {
    cookie: tech.cookie,
    method: "POST",
    body,
  });
async function shot(name, reveal) {
  await page.evaluate(async () => {
    await new Promise((r) =>
      requestAnimationFrame(() => requestAnimationFrame(r)),
    );
    await Promise.all(
      document
        .getAnimations()
        .filter((a) => Number.isFinite(a.effect?.getComputedTiming().endTime))
        .map((a) => a.finished.catch(() => {})),
    );
  });
  if (reveal) await reveal.scrollIntoViewIfNeeded();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  if (await dialog.count()) {
    const box = await dialog.boundingBox();
    assert.ok(
      box && box.y >= 0 && box.y + box.height <= page.viewportSize().height,
    );
  }
  await page.screenshot({
    path: path.join(screenshots, name),
    fullPage: !(await dialog.count()),
    animations: "disabled",
    style: "nextjs-portal { visibility: hidden !important; }",
  });
}
const submitResult = () =>
  dialog.getByRole("button", { name: "提交待确认", exact: true });
async function openResult(v) {
  await visit(v);
  await page.getByRole("button", { name: "提交处理结果", exact: true }).click();
  await dialog.waitFor();
}
try {
  await local.waitForApi();
  const { admin, reporter } = await fixtures.identities(),
    tech = await fixtures.technician("履约页面验收维修员");
  const a = await opened(tech, "更换接线端子后的维修验收"),
    stale = await opened(tech),
    closed = await opened(tech),
    changed = await opened(tech),
    expired = await opened(tech);
  await auth(tech.cookie);
  await openResult(a);
  await submitResult().click();
  await dialog.getByText("请填写处理说明", { exact: true }).waitFor();
  await dialog.getByLabel("处理说明", { exact: true }).fill("取消后应清理");
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "提交处理结果", exact: true }).click();
  assert.equal(
    await dialog.getByLabel("处理说明", { exact: true }).inputValue(),
    "",
  );
  await dialog
    .getByLabel("处理说明", { exact: true })
    .fill("  已更换接线端子。\n连续试运行30分钟正常。  ");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("order-result-dialog-mobile.png");
  let first = true;
  await page.route(`**/api/tasks/${a.ticket.id}/result`, async (route) => {
    commands.push(route.request().postDataJSON());
    if (first) {
      first = false;
      const r = await route.fetch();
      assert.equal(r.status(), 201);
      notify();
      await gate;
      await r.dispose();
      return route.abort("failed");
    }
    return route.continue();
  });
  await submitResult().click();
  await started;
  assert.ok(await submitResult().isDisabled());
  assert.ok(
    await dialog.getByRole("button", { name: /^取\s*消$/ }).isDisabled(),
  );
  await page.keyboard.press("Escape");
  assert.ok(await dialog.isVisible());
  release();
  await dialog.getByText(/尚未确认提交结果/).waitFor();
  await submitResult().click();
  await dialog.waitFor({ state: "hidden" });
  await order().getByText("待用户确认", { exact: true }).waitFor();
  assert.deepEqual(commands[0], commands[1]);
  assert.equal(commands[0].expectedVersion, 5);
  assert.equal(
    await page
      .getByRole("button", { name: "提交处理结果", exact: true })
      .count(),
    0,
  );
  await shot("order-awaiting-confirmation-task-mobile.png");
  await openResult(stale);
  await dialog.getByLabel("处理说明", { exact: true }).fill("过期说明");
  assert.equal((await result(tech, stale)).response.status, 201);
  await submitResult().click();
  await dialog.getByText(/任务已变化/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await order().getByText("待用户确认", { exact: true }).waitFor();
  await page.getByText("另一窗口的处理结果", { exact: true }).waitFor();
  await openResult(closed);
  await dialog.getByLabel("处理说明", { exact: true }).fill("关闭后核对结果");
  await page.route(`**/api/tasks/${closed.ticket.id}/result`, async (route) => {
    const r = await route.fetch();
    assert.equal(r.status(), 201);
    await r.dispose();
    await route.abort("failed");
  });
  await submitResult().click();
  await dialog.getByText(/尚未确认提交结果/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await order().getByText("待用户确认", { exact: true }).waitFor();
  await openResult(changed);
  await dialog.getByLabel("处理说明", { exact: true }).fill("原说明");
  const edits = [];
  await page.route(`**/api/tasks/${changed.ticket.id}/result`, (route) => {
    edits.push(route.request().postDataJSON());
    return edits.length === 1
      ? route.fulfill({ status: 502, json: { message: "尚未确认提交结果" } })
      : route.continue();
  });
  await submitResult().click();
  await dialog.getByText("尚未确认提交结果", { exact: true }).waitFor();
  await dialog.getByLabel("处理说明", { exact: true }).fill("修改后的说明");
  await submitResult().click();
  await dialog.waitFor({ state: "hidden" });
  assert.notEqual(edits[0].requestId, edits[1].requestId);
  await openResult(expired);
  await dialog.getByLabel("处理说明", { exact: true }).fill("过期会话不提交");
  const update = await db.query(
    'UPDATE "Session" SET "expiresAt"=$1 WHERE "tokenHash"=$2',
    [
      new Date(0),
      createHash("sha256")
        .update(tech.cookie.split(";")[0].slice("dsh_session=".length))
        .digest("hex"),
    ],
  );
  assert.equal(update.rowCount, 1);
  await submitResult().click();
  await page.waitForURL("**/login");
  await context.clearCookies();
  await page.goto(portal + "/login", { waitUntil: "networkidle" });
  await page
    .getByRole("textbox", { name: "账号", exact: true })
    .fill("reporter.a");
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL(portal + "/devices");
  for (const c of await context.cookies(portal))
    if (c.name === "dsh_portal_session") tokens.add(c.value);
  await page.goto(`${portal}/tickets/${a.ticket.id}`, {
    waitUntil: "networkidle",
  });
  await order().getByText("待用户确认", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "取消订单", exact: true }).count(),
    0,
  );
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
  await dialog
    .getByLabel("待确认的处理结果")
    .getByText("已更换接线端子。", { exact: false })
    .waitFor();
  await shot("order-confirm-dialog-mobile.png");
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
  let firstConfirm = true;
  await page.route(`**/api/tickets/${a.ticket.id}/confirm`, async (route) => {
    decisions.push(route.request().postDataJSON());
    if (firstConfirm) {
      firstConfirm = false;
      const r = await route.fetch();
      assert.equal(r.status(), 201);
      confirmNotify();
      await confirmGate;
      await r.dispose();
      return route.abort("failed");
    }
    return route.continue();
  });
  const confirm = () =>
    dialog.getByRole("button", { name: "确认完成", exact: true });
  await confirm().click();
  await confirmStarted;
  assert.ok(await confirm().isDisabled());
  await page.keyboard.press("Escape");
  assert.ok(await dialog.isVisible());
  confirmRelease();
  await dialog.getByText(/尚未确认操作结果/).waitFor();
  await confirm().click();
  await dialog.waitFor({ state: "hidden" });
  await order().getByText("已完成", { exact: true }).waitFor();
  assert.deepEqual(decisions[0], decisions[1]);
  assert.equal(decisions[0].expectedVersion, 6);
  await order().getByText("未接入支付", { exact: true }).waitFor();
  await order()
    .getByText("订单金额：¥59.98（人民币）", { exact: true })
    .waitFor();
  await shot("portal-order-completed-mobile.png");
  await page.reload({ waitUntil: "networkidle" });
  await order().getByText("已完成", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "确认完成", exact: true }).count(),
    0,
  );
  await page.goto(`${portal}/tickets/${stale.ticket.id}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "确认完成", exact: true }).click();
  assert.equal(
    (
      await local.request(`/tickets/${stale.ticket.id}/confirm`, {
        cookie: reporter,
        method: "POST",
        body: { requestId: randomUUID(), expectedVersion: 6 },
      })
    ).response.status,
    201,
  );
  await confirm().click();
  await dialog.getByText(/工单已变化/).waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await page.getByRole("button", { name: "刷新进度", exact: true }).click();
  await order().getByText("已完成", { exact: true }).waitFor();
  await page.setViewportSize({ width: 1440, height: 1100 });
  await auth(admin);
  await page.goto(web + "/service/admin/tickets?status=completed", {
    waitUntil: "networkidle",
  });
  await page
    .locator("tbody tr.ant-table-row")
    .filter({ hasText: "更换接线端子后的维修验收" })
    .getByRole("button", { name: "详情", exact: true })
    .click();
  await order().getByText("已完成", { exact: true }).waitFor();
  await page.getByText("已更换接线端子。", { exact: false }).waitFor();
  await shot("order-completed-admin.png", order());
  await auth(await local.login(tech.id));
  await visit(a);
  await order().getByText("已完成", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "提交处理结果", exact: true })
      .count(),
    0,
  );
  await shot("order-completed-task-desktop.png");
  assert.deepEqual(errors, []);
  console.log(
    "Order fulfillment UI: shared result and confirmation dialogs, validation/reset, exact lost-response replay, in-flight protection, stale windows, changed-content intents, close/reread, expiry, three-role completed records and immutable order/payment labels passed.",
  );
} catch (error) {
  await page
    .screenshot({
      path: path.join(local.root, ".local/order-fulfillment-ui-failure.png"),
      fullPage: true,
    })
    .catch(() => {});
  throw error;
} finally {
  release();
  confirmRelease();
  for (const token of tokens)
    await local.logout("dsh_session=" + token).catch(() => {});
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

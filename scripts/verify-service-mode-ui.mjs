import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "service.mode.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "service-mode-profile",
);
const web = "http://127.0.0.1:5173";
const dialog = page.getByRole("dialog", { name: "改为需报价", exact: true });
const submit = () =>
  dialog.getByRole("button", { name: "确认改为需报价", exact: true });
const bodies = [];
let release = () => {},
  notify = () => {};
const gate = new Promise((r) => {
    release = r;
  }),
  started = new Promise((r) => {
    notify = r;
  });
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
async function detail(ticket) {
  await page.goto(web + "/service/admin/tickets", { waitUntil: "networkidle" });
  await page
    .getByRole("row")
    .filter({ hasText: ticket.code })
    .getByRole("button", { name: "详情", exact: true })
    .click();
  await page.getByRole("dialog", { name: ticket.code, exact: true }).waitFor();
  await page.getByRole("button", { name: "改为需报价", exact: true }).waitFor();
}
async function open() {
  await page.getByRole("button", { name: "改为需报价", exact: true }).click();
  await dialog.waitFor();
}
async function shot(name) {
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
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(screenshots, name),
    animations: "disabled",
  });
}
async function changes(ticket) {
  return (
    await db.query(
      'SELECT count(*)::int AS n FROM "TicketServiceModeChange" WHERE "ticketId"=$1',
      [ticket.id],
    )
  ).rows[0].n;
}
try {
  await local.waitForApi();
  const { admin } = await fixtures.identities();
  const tech = await fixtures.technician("方式调整页面验收维修员");
  const a = await fixtures.task(tech, { title: "分派方式误选调整" });
  await auth(admin);
  await detail(a);
  await open();
  await submit().click();
  await dialog.getByText("请填写调整原因", { exact: true }).waitFor();
  assert.equal(await changes(a), 0);
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await open();
  assert.equal(
    await dialog
      .getByRole("textbox", { name: "调整原因", exact: true })
      .inputValue(),
    "",
  );
  await dialog
    .getByRole("textbox", { name: "调整原因", exact: true })
    .fill("分派误选，需先确认维修费用");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("service-mode-dialog-mobile.png");
  let first = true;
  const routePattern = `**/api/admin/tickets/${a.id}/require-quote`;
  await page.route(routePattern, async (route) => {
    bodies.push(route.request().postDataJSON());
    if (first) {
      first = false;
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      notify();
      await gate;
      await response.dispose();
      return route.abort("failed");
    }
    return route.continue();
  });
  await submit().click();
  await started;
  assert.equal(await submit().isDisabled(), true);
  assert.equal(
    await dialog
      .getByRole("textbox", { name: "调整原因", exact: true })
      .isDisabled(),
    true,
  );
  assert.equal(
    await dialog.getByRole("button", { name: /^取\s*消$/ }).isDisabled(),
    true,
  );
  release();
  await dialog.getByRole("alert").waitFor();
  await submit().click();
  await dialog.waitFor({ state: "hidden" });
  assert.equal(bodies.length, 2);
  assert.deepEqual(bodies[0], bodies[1]);
  assert.equal(await changes(a), 1);
  await page
    .getByText("调整原因：分派误选，需先确认维修费用", { exact: false })
    .waitFor();
  assert.equal(
    await page.getByRole("region", { name: "现场照片", exact: true }).count(),
    1,
  );
  assert.equal(
    await page.getByRole("button", { name: "改为需报价", exact: true }).count(),
    0,
  );
  await page
    .getByRole("dialog", { name: a.code, exact: true })
    .locator(".ant-modal-body")
    .evaluate((el) => {
      el.scrollTop = 0;
    });
  await shot("service-mode-changed-mobile.png");
  // Existing technician session must read the new mode and enter the quote flow.
  await auth(tech.cookie);
  await page.goto(web + `/service/tasks/${a.id}`, { waitUntil: "networkidle" });
  await page.getByRole("button", { name: "编制报价", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "提交处理结果", exact: true })
      .count(),
    0,
  );
  await page.setViewportSize({ width: 1280, height: 900 });
  const stale = await fixtures.task(tech, { title: "方式调整过期窗口" });
  await auth(admin);
  await detail(stale);
  await open();
  await dialog
    .getByRole("textbox", { name: "调整原因", exact: true })
    .fill("旧窗口调整");
  const result = await local.request(`/tasks/${stale.id}/result`, {
    cookie: tech.cookie,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: stale.version,
      description: "另一窗口已完成维修处理",
    },
  });
  assert.equal(result.response.status, 201);
  await submit().click();
  await dialog
    .getByRole("alert")
    .filter({ hasText: "不能改为需报价" })
    .waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByText("服务方式", { exact: true }).waitFor();
  await page.waitForFunction(
    () =>
      ![...document.querySelectorAll("button")].some(
        (b) => b.textContent === "改为需报价",
      ),
  );
  assert.equal(await changes(stale), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Service mode UI: admin entry, required reason, cancel/reset, busy controls, exact UUID retry after lost response, audit display, technician quote entry, stale-result 409 and reread, mobile layout passed.",
  );
} finally {
  release();
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

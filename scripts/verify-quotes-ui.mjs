import assert from "node:assert/strict";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "quote.ui");
const { context, page, screenshots, errors } = await openLocalBrowser(
  "quotes-browser-profile",
);
const title = "空调接线检修报价 " + Date.now();
const payloads = [];
let lost = false;
async function login(username) {
  await page.getByRole("textbox", { name: "账号", exact: true }).fill(username);
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL("**/service/devices");
}
async function logout() {
  await page.getByRole("button", { name: "退出登录", exact: true }).click();
  await page.waitForURL("**/login");
}
async function choose(label, value) {
  await page.getByRole("combobox", { name: label, exact: true }).click();
  await page
    .locator(".ant-select-dropdown:visible")
    .getByText(value, { exact: true })
    .click();
}
async function shot(file) {
  await page.evaluate(
    () =>
      new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      ),
  );
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
    "No horizontal overflow",
  );
  await page.screenshot({
    path: path.join(screenshots, file),
    fullPage: (await page.getByRole("dialog").count()) === 0,
    animations: "disabled",
  });
}
try {
  await local.waitForApi();
  const tech = await fixtures.technician("报价验收维修员");
  const task = await fixtures.task(tech, { stage: "pending", title });
  await context.clearCookies();
  await page.goto("http://127.0.0.1:5173/service/admin/tickets");
  await page.waitForURL("**/login");
  await login("admin");
  await page.goto("http://127.0.0.1:5173/service/admin/tickets?status=pending");
  const row = page.locator("tbody tr.ant-table-row").filter({ hasText: title });
  await row.getByRole("button", { name: "分派", exact: true }).click();
  const assignment = page.getByRole("dialog", { name: "分派维修人员" });
  await choose("维修人员", tech.name);
  assert.ok(await assignment.getByText("直接处理", { exact: true }).count());
  await choose("服务方式", "需报价");
  await assignment
    .getByRole("button", { name: "确认分派", exact: true })
    .click();
  await assignment.waitFor({ state: "hidden" });
  await logout();
  await login(tech.id);
  await page.goto("http://127.0.0.1:5173/service/tasks/" + task.id);
  await page.getByRole("button", { name: "接单", exact: true }).click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认接单", exact: true })
    .click();
  await page.getByRole("button", { name: "编制报价", exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "提交处理结果", exact: true })
      .count(),
    0,
  );
  await page.getByRole("button", { name: "编制报价", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "提交维修报价" });
  await page.getByLabel("项目名称 1", { exact: true }).fill("关闭后应清空");
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "编制报价", exact: true }).click();
  assert.equal(
    await page.getByLabel("项目名称 1", { exact: true }).inputValue(),
    "",
  );
  await page.getByLabel("项目名称 1", { exact: true }).fill("更换接线端子");
  await page.getByLabel("数量 1", { exact: true }).fill("3");
  await page.getByLabel("单价 1", { exact: true }).fill("19.999");
  await dialog.getByRole("button", { name: "提交报价", exact: true }).click();
  await dialog
    .getByText("单价须为非负金额，最多两位小数", { exact: true })
    .first()
    .waitFor();
  await page.getByLabel("单价 1", { exact: true }).fill("19.99");
  await page.getByLabel("备注 1", { exact: true }).fill("含安装与接线复检");
  await dialog
    .getByRole("button", { name: "添加报价条目", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("项目名称 2", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await page.getByLabel("数量 2", { exact: true }).inputValue(),
    "1",
  );
  await page.getByLabel("项目名称 2", { exact: true }).fill("删除后应清空");
  await page.getByLabel("备注 2", { exact: true }).fill("独立条目");
  await dialog.getByRole("button", { name: "删除条目 2", exact: true }).click();
  await dialog
    .getByRole("button", { name: "添加报价条目", exact: true })
    .click();
  assert.equal(
    await page.getByLabel("项目名称 2", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await page.getByLabel("备注 2", { exact: true }).inputValue(),
    "",
  );
  assert.equal(
    await page.getByLabel("单价 1", { exact: true }).inputValue(),
    "19.99",
  );
  assert.equal(
    await page.getByLabel("备注 1", { exact: true }).inputValue(),
    "含安装与接线复检",
  );
  await page
    .locator('section[aria-label="报价条目 1"]')
    .getByText(/8\s*\/\s*200/)
    .waitFor();
  await page.getByLabel("项目名称 2", { exact: true }).fill("故障检测");
  await page.getByLabel("单价 2", { exact: true }).fill("0.01");
  await dialog.getByText("预估合计：¥59.98", { exact: true }).waitFor();
  await shot("quote-form-desktop.png");
  await page.setViewportSize({ width: 390, height: 844 });
  await shot("quote-form-mobile.png");
  await dialog
    .getByText("以服务端计算金额为准", { exact: true })
    .scrollIntoViewIfNeeded();
  await shot("quote-form-mobile-bottom.png");
  const submitBox = await dialog
    .getByRole("button", { name: "提交报价", exact: true })
    .boundingBox();
  assert.ok(
    submitBox && submitBox.y >= 0 && submitBox.y + submitBox.height <= 844,
    "Long form retains a visible submit action",
  );
  await page.route(`**/api/tickets/${task.id}/quote`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    payloads.push(route.request().postDataJSON());
    if (!lost) {
      lost = true;
      const response = await route.fetch();
      assert.equal(response.status(), 201);
      await response.dispose();
      return route.abort("failed");
    }
    return route.continue();
  });
  await dialog.getByRole("button", { name: "提交报价", exact: true }).click();
  await dialog
    .getByRole("button", { name: "提交报价", exact: true })
    .waitFor({ state: "visible" });
  await dialog
    .getByText(/报价结果尚未确认|Failed to fetch|fetch/)
    .first()
    .waitFor();
  await dialog.getByRole("button", { name: "提交报价", exact: true }).click();
  await dialog.waitFor({ state: "hidden" });
  const summary = page.getByLabel("报价明细", { exact: true });
  await summary
    .getByText("报价合计：¥59.98（人民币）", { exact: true })
    .waitFor();
  assert.equal(payloads.length, 2);
  assert.deepEqual(payloads[0], payloads[1]);
  assert.equal("totalCents" in payloads[0], false);
  await page.reload();
  await summary.getByText("报价第 1 版", { exact: true }).waitFor();
  assert.equal(
    await page.getByRole("button", { name: "编制报价", exact: true }).count(),
    0,
  );
  await shot("quote-detail-mobile.png");
  await page.setViewportSize({ width: 1440, height: 1100 });
  await shot("quote-detail-desktop.png");
  const audit = (
    await db.query(
      'SELECT "totalCents",(SELECT COUNT(*)::int FROM "QuoteItem" WHERE "quoteId"=q."id") AS items FROM "TicketQuote" q WHERE "ticketId"=$1',
      [task.id],
    )
  ).rows;
  assert.deepEqual(audit, [{ totalCents: 5998, items: 2 }]);
  const uncertain = await fixtures.task(tech, { serviceMode: "quoted" });
  await page.goto("http://127.0.0.1:5173/service/tasks/" + uncertain.id);
  await page.getByRole("button", { name: "编制报价", exact: true }).click();
  await page.getByLabel("项目名称 1", { exact: true }).fill("响应丢失核对");
  await page.getByLabel("单价 1", { exact: true }).fill("10.00");
  let uncertainWrites = 0;
  await page.route(`**/api/tickets/${uncertain.id}/quote`, async (route) => {
    if (route.request().method() !== "POST") return route.continue();
    uncertainWrites++;
    const response = await route.fetch();
    assert.equal(response.status(), 201);
    await response.dispose();
    return route.abort("failed");
  });
  await dialog.getByRole("button", { name: "提交报价", exact: true }).click();
  await dialog
    .getByText(/报价结果尚未确认|Failed to fetch|fetch/)
    .first()
    .waitFor();
  await dialog.getByRole("button", { name: /^取\s*消$/ }).click();
  await dialog.waitFor({ state: "hidden" });
  await summary
    .getByText("报价合计：¥10.00（人民币）", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "编制报价", exact: true }).count(),
    0,
  );
  assert.equal(
    uncertainWrites,
    1,
    "Closing an uncertain write reads the actual record before reopening",
  );
  await logout();
  await login("admin");
  await page.goto(
    "http://127.0.0.1:5173/service/admin/tickets?status=processing",
  );
  await row.getByRole("button", { name: "详情", exact: true }).click();
  await summary
    .getByText("报价合计：¥59.98（人民币）", { exact: true })
    .waitFor();
  assert.equal(
    await page.getByRole("button", { name: "编制报价", exact: true }).count(),
    0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  await summary
    .getByText("报价合计：¥59.98（人民币）", { exact: true })
    .scrollIntoViewIfNeeded();
  await shot("quote-admin-mobile.png");
  const other = await fixtures.technician("报价范围验收维修员");
  await page.getByRole("dialog").locator(".ant-modal-close").click();
  await logout();
  await login(other.id);
  await page.goto("http://127.0.0.1:5173/service/tasks/" + task.id);
  await page.getByText("任务不存在或无权访问", { exact: true }).waitFor();
  assert.equal(await page.getByLabel("报价明细", { exact: true }).count(), 0);
  assert.deepEqual(errors, []);
  console.log(
    "Quote UI: assignment mode, multi-item price validation, cancellation cleanup, lost-response replay, refresh persistence, admin read-only, cross-user isolation and 390px screenshots passed.",
  );
} finally {
  await context.close();
  await fixtures.cleanup();
  await db.end();
}

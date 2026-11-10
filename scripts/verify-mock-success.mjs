import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "mock.success");
const check = (r, s) => {
  assert.equal(r.response.status, s, JSON.stringify(r.value));
  return r.value;
};
let browser;
try {
  await local.waitForApi();
  const { admin, reporter } = await f.identities(),
    other = await local.login("reporter.b"),
    tech = await f.technician("模拟结果验收维修员");
  const create = async (v) =>
    check(
      await local.request(`/orders/${v.order.id}/payments`, {
        cookie: reporter,
        method: "POST",
        body: { requestId: randomUUID() },
      }),
      201,
    );
  const confirm = (cookie, v, p) =>
    local.request(`/orders/${v.order.id}/payments/${p.id}/mock-success`, {
      cookie,
      method: "POST",
      body: {},
    });
  const cancel = (v) =>
    local.request(`/orders/${v.order.id}/cancel`, {
      cookie: reporter,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: v.ticket.version,
        reason: "并发取消",
      },
    });
  const v = await f.orderedTask(tech),
    p = await create(v);
  check(await confirm(undefined, v, p), 401);
  check(await confirm(admin, v, p), 403);
  check(await confirm(tech.cookie, v, p), 403);
  check(await confirm(other, v, p), 404);
  const rows = await Promise.all(
    Array.from({ length: 8 }, () => confirm(reporter, v, p)),
  );
  rows.forEach((r) => {
    assert.equal(check(r, 201).status, "succeeded");
  });
  assert.equal(new Set(rows.map((r) => r.value.succeededAt)).size, 1);
  check(await cancel(v), 409);
  check(
    await local.request(`/orders/${v.order.id}/payments`, {
      cookie: reporter,
      method: "POST",
      body: { requestId: randomUUID() },
    }),
    409,
  );
  for (let i = 0; i < 5; i++) {
    const r = await f.orderedTask(tech),
      a = await create(r);
    const results = await Promise.all([confirm(reporter, r, a), cancel(r)]);
    assert.deepEqual(results.map((x) => x.response.status).sort(), [201, 409]);
    const actual = (
      await db.query('SELECT status FROM "PaymentAttempt" WHERE id=$1', [a.id])
    ).rows[0];
    assert.equal(
      actual.status,
      results[0].response.status === 201 ? "succeeded" : "closed",
    );
  }
  const mismatch = await f.orderedTask(tech),
    bad = await create(mismatch);
  await db.query(
    'UPDATE "PaymentAttempt" SET "amountCents"="amountCents"+1 WHERE id=$1',
    [bad.id],
  );
  check(await confirm(reporter, mismatch, bad), 409);
  const ui = await f.orderedTask(tech),
    uip = await create(ui);
  browser = await openLocalBrowser("mock-success-profile");
  const { context, page, screenshots, errors } = browser;
  await context.clearCookies();
  await page.goto("http://127.0.0.1:3000/login", { waitUntil: "networkidle" });
  await page.getByLabel("账号", { exact: true }).fill("reporter.a");
  await page
    .getByLabel("密码", { exact: true })
    .fill(process.env.SEED_ACCOUNT_PASSWORD);
  await page.getByRole("button", { name: /^登\s*录$/ }).click();
  await page.waitForURL("**/devices");
  await page.goto(`http://127.0.0.1:3000/orders/${ui.order.id}`, {
    waitUntil: "networkidle",
  });
  await page.getByRole("button", { name: "模拟支付成功", exact: true }).click();
  const dialog = page.getByRole("dialog", {
    name: "确认模拟成功",
    exact: true,
  });
  await dialog.waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(async()=>{ await new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r))); await Promise.all(document.getAnimations().filter(a=>Number.isFinite(a.effect?.getComputedTiming().endTime)).map(a=>a.finished.catch(()=>{}))); });
  await page.screenshot({
    path: path.join(screenshots, "mock-success-dialog-mobile.png"),
    animations: "disabled",
  });
  const confirmed = page.waitForResponse(r=>r.url().includes("/mock-success") && r.request().method()==="POST");
  await dialog
    .getByRole("button", { name: "确认模拟成功", exact: true })
    .click();
  const confirmationResponse = await confirmed; assert.equal(confirmationResponse.status(),201);
  await page.getByText("已成功（模拟）", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "模拟支付成功", exact: true })
      .count(),
    0,
  );
  await page.reload({ waitUntil: "networkidle" });
  await page.getByText("已成功（模拟）", { exact: true }).waitFor();
  assert.ok(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  );
  await page.screenshot({
    path: path.join(screenshots, "mock-success-result-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  assert.deepEqual(errors, []);
  console.log(
    "Mock success: ownership, roles, idempotent confirmation, amount verification, cancellation races, portal confirmation and server reread passed. No real payment.",
  );
} finally {
  if (browser) await browser.context.close();
  await f.cleanup();
  await db.end();
}


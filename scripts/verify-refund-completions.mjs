import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "refund.complete");
let browser,
  constrained = false;
const constraint = "refund_finish_" + randomUUID().replaceAll("-", "");
const ck = (r, n) => {
  assert.equal(r.response.status, n, JSON.stringify(r.value));
  return r.value;
};
try {
  await local.waitForApi();
  const { admin, reporter } = await f.identities(),
    tech = await f.technician("退款处理验收维修员");
  const setup = async () => {
    const v = await f.orderedTask(tech);
    const p = ck(
      await local.request(`/orders/${v.order.id}/payments`, {
        cookie: reporter,
        method: "POST",
        body: { requestId: randomUUID() },
      }),
      201,
    );
    ck(
      await local.request(
        `/orders/${v.order.id}/payments/${p.id}/mock-success`,
        { cookie: reporter, method: "POST", body: {} },
      ),
      201,
    );
    const applied = ck(
      await local.request(`/orders/${v.order.id}/payments/${p.id}/refund`, {
        cookie: reporter,
        method: "POST",
        body: { requestId: randomUUID(), reason: "未开工取消服务" },
      }),
      201,
    );
    return { ...v, p: applied };
  };
  const finish = (v, cookie = admin, input = { requestId: randomUUID() }) =>
    local.request(
      `/orders/${v.order.id}/payments/${v.p.id}/refund/mock-success`,
      { cookie, method: "POST", body: input },
    );
  const state = async (v) =>
    (
      await db.query(
        'SELECT t.status,t.version,o.status AS "orderStatus",(SELECT count(*)::int FROM "MockRefundCompletion" c WHERE c."refundId"=$2) AS n FROM "Ticket" t JOIN "ServiceOrder" o ON o."ticketId"=t.id WHERE t.id=$1',
        [v.ticket.id, v.p.refund.id],
      )
    ).rows[0];
  const a = await setup(),
    input = { requestId: randomUUID() };
  ck(await finish(a, null, input), 401);
  ck(await finish(a, reporter, input), 403);
  ck(await finish(a, tech.cookie, input), 403);
  ck(await finish(a, admin, { ...input, amountCents: 1 }), 400);
  ck(await finish(a, admin, { requestId: "bad" }), 400);
  const rr = await Promise.all(
    Array.from({ length: 8 }, () => finish(a, admin, input)),
  );
  rr.forEach((r) => ck(r, 201));
  assert.equal(
    new Set(rr.map((r) => r.value.refund.completion.createdAt)).size,
    1,
  );
  assert.equal(rr[0].value.refund.status, "succeeded");
  assert.equal(rr[0].value.status, "succeeded");
  assert.deepEqual(await state(a), {
    status: "cancelled",
    version: 6,
    orderStatus: "cancelled",
    n: 1,
  });
  ck(await finish(a), 409);
  const distinct = await setup();
  const race = await Promise.all(
    Array.from({ length: 5 }, () => finish(distinct)),
  );
  assert.equal(race.filter((r) => r.response.status === 201).length, 1);
  assert.equal(race.filter((r) => r.response.status === 409).length, 4);
  const rollback = await setup(),
    retry = { requestId: randomUUID() },
    before = await state(rollback);
  await db.query(
    `ALTER TABLE "ServiceOrderCancellation" ADD CONSTRAINT "${constraint}" CHECK ("orderId" <> '${rollback.order.id}')`,
  );
  constrained = true;
  ck(await finish(rollback, admin, retry), 500);
  assert.deepEqual(await state(rollback), before);
  await db.query(
    `ALTER TABLE "ServiceOrderCancellation" DROP CONSTRAINT "${constraint}"`,
  );
  constrained = false;
  ck(await finish(rollback, admin, retry), 201);
  const ui = await setup();
  browser = await openLocalBrowser("refund-completion-profile");
  const { context, page, screenshots, errors } = browser;
  await context.clearCookies();
  await context.addCookies([
    {
      name: "dsh_session",
      value: admin.split(";")[0].slice("dsh_session=".length),
      domain: "127.0.0.1",
      path: "/api",
      httpOnly: true,
      sameSite: "Strict",
    },
  ]);
  await page.goto(`http://127.0.0.1:5173/service/orders/${ui.order.id}`, {
    waitUntil: "networkidle",
  });
  await page
    .getByRole("button", { name: "记录模拟退款成功", exact: true })
    .click();
  const dialog = page.getByRole("dialog", {
    name: "记录模拟退款成功",
    exact: true,
  });
  await dialog.waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
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
  await page.screenshot({
    path: path.join(screenshots, "refund-completion-dialog-mobile.png"),
    animations: "disabled",
  });
  await dialog
    .getByRole("button", { name: "确认模拟退款成功", exact: true })
    .click();
  await page.getByText("退款成功（模拟）", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "记录模拟退款成功", exact: true })
      .count(),
    0,
  );
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
  await page.getByText("退款成功（模拟）", { exact: true }).waitFor();
  await page.getByText("处理时间", { exact: true }).waitFor();
  await page.screenshot({
    path: path.join(screenshots, "refund-completion-portal-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  assert.deepEqual(errors, []);
  console.log(
    "Refund completion: admin-only, DTO, same/distinct intent races, atomic ticket/order/audit, cancellation-audit rollback/retry, admin action and portal result passed. No real refund.",
  );
} finally {
  if (constrained)
    await db.query(
      `ALTER TABLE "ServiceOrderCancellation" DROP CONSTRAINT "${constraint}"`,
    );
  if (browser) await browser.context.close();
  await f.cleanup();
  await db.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
import { openLocalBrowser } from "./lib/browser.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "mock.expiry");
let browser;
const check = (r, n) => {
  assert.equal(r.response.status, n, JSON.stringify(r.value));
  return r.value;
};
try {
  await local.waitForApi();
  const { reporter, admin } = await f.identities(),
    other = await local.login("reporter.b"),
    tech = await f.technician("支付超时验收维修员");
  const create = (v, id = randomUUID()) =>
    local.request(`/orders/${v.order.id}/payments`, {
      cookie: reporter,
      method: "POST",
      body: { requestId: id },
    });
  const confirm = (v, p) =>
    local.request(`/orders/${v.order.id}/payments/${p.id}/mock-success`, {
      cookie: reporter,
      method: "POST",
      body: {},
    });
  const query = (v, cookie = reporter) =>
    local.request(`/orders/${v.order.id}/payments`, { cookie });
  const expire = (p) =>
    db.query(
      "UPDATE \"PaymentAttempt\" SET \"expiresAt\"=(clock_timestamp() AT TIME ZONE 'UTC')-interval '1 second' WHERE id=$1",
      [p.id],
    );
  const v = await f.orderedTask(tech),
    intent = randomUUID(),
    p = check(await create(v, intent), 201);
  assert.equal(
    Date.parse(p.expiresAt) - Date.parse(p.createdAt),
    15 * 60 * 1000,
  );
  await expire(p);
  check(await query(v, other), 404);
  check(await query(v, tech.cookie), 403);
  assert.equal(
    (await db.query('SELECT status FROM "PaymentAttempt" WHERE id=$1', [p.id]))
      .rows[0].status,
    "pending",
  );
  check(await confirm(v, p), 409);
  assert.equal(
    check(await query(v, admin), 200).payments[0].closeReason,
    "expired",
  );
  assert.equal(check(await create(v, intent), 201).id, p.id);
  const retry = check(await create(v), 201);
  assert.notEqual(retry.id, p.id);
  check(await confirm(v, retry), 201);
  await expire(retry);
  assert.equal(
    check(await query(v), 200).payments.find((x) => x.id === retry.id).status,
    "succeeded",
  );
  for (let i = 0; i < 4; i++) {
    const a = await f.orderedTask(tech),
      b = check(await create(a), 201);
    await expire(b);
    const rr = await Promise.all([confirm(a, b), query(a), query(a, admin)]);
    assert.equal(rr[0].response.status, 409);
    assert.equal(
      (
        await db.query(
          'SELECT status,"closeReason" FROM "PaymentAttempt" WHERE id=$1',
          [b.id],
        )
      ).rows[0].closeReason,
      "expired",
    );
    const re = await Promise.all([create(a), create(a)]);
    assert.deepEqual(re.map((x) => x.response.status).sort(), [201, 409]);
  }
  const ui = await f.orderedTask(tech),
    up = check(await create(ui), 201);
  await expire(up);
  browser = await openLocalBrowser("mock-expiry-profile");
  const { page, context, screenshots, errors } = browser;
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
  await page.getByText("已超时关闭（模拟）", { exact: true }).waitFor();
  assert.equal(
    await page
      .getByRole("button", { name: "模拟支付成功", exact: true })
      .count(),
    0,
  );
  await page
    .getByRole("button", { name: "创建模拟支付单", exact: true })
    .waitFor();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({
    path: path.join(screenshots, "mock-expiry-mobile.png"),
    fullPage: true,
    animations: "disabled",
  });
  await page
    .getByRole("button", { name: "创建模拟支付单", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "确认创建模拟支付单", exact: true })
    .click();
  await page.getByText("待支付（模拟）", { exact: true }).waitFor();
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "PaymentAttempt" WHERE "orderId"=$1',
        [ui.order.id],
      )
    ).rows[0].n,
    2,
  );
  assert.deepEqual(errors, []);
  console.log(
    "Mock expiry: deadline, unauthorized no-write, confirmation rejection persisted, terminal preservation, intent replay, query races, concurrent recreation, portal SSR and recreation passed.",
  );
} finally {
  if (browser) await browser.context.close();
  await f.cleanup();
  await db.end();
}

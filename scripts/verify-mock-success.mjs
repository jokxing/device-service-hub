import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "mock.success");
const check = (r, s) => {
  assert.equal(r.response.status, s, JSON.stringify(r.value));
  return r.value;
};
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
  console.log(
    "Legacy mock API business checks passed; mock Web/portal actions are retired. No real payment.",
  );
} finally {
  await f.cleanup();
  await db.end();
}

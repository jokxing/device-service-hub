import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "mock.refund");
const constraint = "refund_test_" + randomUUID().replaceAll("-", "");
let constrained = false;
const ck = (r, n) => {
  assert.equal(r.response.status, n, JSON.stringify(r.value));
  return r.value;
};
try {
  await local.waitForApi();
  const { reporter, admin } = await f.identities(),
    other = await local.login("reporter.b"),
    tech = await f.technician("退款申请验收维修员");
  const paid = async () => {
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
    return { ...v, p };
  };
  const input = () => ({
    requestId: randomUUID(),
    reason: "尚未开工，申请全额退款",
  });
  const refund = (v, cookie = reporter, body = input()) =>
    local.request(`/orders/${v.order.id}/payments/${v.p.id}/refund`, {
      cookie,
      method: "POST",
      body,
    });
  const start = (v) =>
    local.request(`/orders/${v.order.id}/start`, {
      cookie: tech.cookie,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: v.ticket.version },
    });
  const a = await paid(),
    i = input();
  ck(await refund(a, null, i), 401);
  ck(await refund(a, admin, i), 403);
  ck(await refund(a, tech.cookie, i), 403);
  ck(await refund(a, other, i), 404);
  for (const patch of [
    { reason: " " },
    { amountCents: 1 },
    { requestId: "bad" },
    { reason: "a".repeat(501) },
  ])
    ck(await refund(a, reporter, { ...i, ...patch }), 400);
  const rows = await Promise.all(
    Array.from({ length: 8 }, () => refund(a, reporter, i)),
  );
  rows.forEach((r) => ck(r, 201));
  assert.equal(new Set(rows.map((r) => r.value.refund.id)).size, 1);
  assert.equal(rows[0].value.refund.amountCents, a.order.totalCents);
  assert.equal(rows[0].value.status, "succeeded");
  ck(await refund(a), 409);
  ck(await refund(a, reporter, { ...i, reason: "换原因" }), 409);
  ck(await start(a), 409);
  const current = (
    await db.query('SELECT version FROM "Ticket" WHERE id=$1', [a.ticket.id])
  ).rows[0].version;
  ck(await start({ ...a, ticket: { ...a.ticket, version: current } }), 409);
  for (let n = 0; n < 4; n++) {
    const v = await paid();
    const rr = await Promise.all([refund(v), start(v)]);
    assert.deepEqual(rr.map((r) => r.response.status).sort(), [201, 409]);
  }
  const begun = await paid();
  ck(await start(begun), 201);
  ck(await refund(begun), 409);
  const rollback = await paid(),
    retry = input();
  const before = (
    await db.query('SELECT version FROM "Ticket" WHERE id=$1', [
      rollback.ticket.id,
    ])
  ).rows[0].version;
  await db.query(
    `ALTER TABLE "MockRefundRequest" ADD CONSTRAINT "${constraint}" CHECK ("paymentId" <> '${rollback.p.id}')`,
  );
  constrained = true;
  ck(await refund(rollback, reporter, retry), 500);
  assert.equal(
    (
      await db.query('SELECT version FROM "Ticket" WHERE id=$1', [
        rollback.ticket.id,
      ])
    ).rows[0].version,
    before,
  );
  await db.query(
    `ALTER TABLE "MockRefundRequest" DROP CONSTRAINT "${constraint}"`,
  );
  constrained = false;
  ck(await refund(rollback, reporter, retry), 201);
  console.log(
    "Legacy mock API business checks passed; mock Web/portal actions are retired. No real payment.",
  );
} finally {
  if (constrained)
    await db.query(
      `ALTER TABLE "MockRefundRequest" DROP CONSTRAINT "${constraint}"`,
    );
  await f.cleanup();
  await db.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "mock.payment");
const check = (r, s) => {
  assert.equal(r.response.status, s, JSON.stringify(r.value));
  return r.value;
};
const cmd = () => ({ requestId: randomUUID() });
const create = (cookie, v, body = cmd()) =>
  local.request(`/orders/${v.order.id}/payments`, {
    cookie,
    method: "POST",
    body,
  });
const read = (cookie, v) =>
  local.request(`/orders/${v.order.id}/payments`, { cookie });
const cancel = (cookie, v) =>
  local.request(`/orders/${v.order.id}/cancel`, {
    cookie,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: 4,
      reason: "取消后关闭模拟支付单",
    },
  });
const constraint = "mockpay_" + randomUUID().replaceAll("-", "");
let constrainedTable;
async function state(v) {
  return (
    await db.query(
      'SELECT t.status,t.version,o.status AS "orderStatus",(SELECT COUNT(*)::int FROM "PaymentAttempt" p WHERE p."orderId"=o.id) AS payments,(SELECT COUNT(*)::int FROM "PaymentAttempt" p WHERE p."orderId"=o.id AND p.status=\'pending\') AS pending FROM "Ticket" t JOIN "ServiceOrder" o ON o."ticketId"=t.id WHERE t.id=$1',
      [v.ticket.id],
    )
  ).rows[0];
}
try {
  await local.waitForApi();
  const { admin, reporter } = await fixtures.identities(),
    reporterB = await local.login("reporter.b"),
    tech = await fixtures.technician("模拟支付验收维修员");
  const a = await fixtures.orderedTask(tech),
    b = await fixtures.orderedTask(tech),
    input = cmd();
  check(await create(undefined, a, input), 401);
  for (const cookie of [admin, tech.cookie])
    check(await create(cookie, a, input), 403);
  check(await create(reporterB, a, input), 404);
  check(await read(undefined, a), 401);
  check(await read(tech.cookie, a), 403);
  check(await read(reporterB, a), 404);
  assert.deepEqual(check(await read(reporter, a), 200).payments, []);
  for (const body of [
    {},
    { requestId: "bad" },
    { ...input, amountCents: 1 },
    { ...input, currency: "USD" },
    { ...input, channel: "wechat" },
    { ...input, status: "pending" },
    { ...input, actorId: "user-admin" },
    { ...input, expectedVersion: 4 },
  ])
    check(await create(reporter, a, body), 400);
  const same = await Promise.all(
    Array.from({ length: 8 }, () => create(reporter, a, input)),
  );
  const payment = check(same[0], 201);
  for (const r of same) assert.deepEqual(check(r, 201), payment);
  assert.equal(payment.amountCents, 5998);
  assert.equal(payment.currency, "CNY");
  assert.equal(payment.channel, "mock");
  assert.equal(payment.status, "pending");
  assert.equal(payment.closedAt, null);
  assert.equal(payment.closeReason, null);
  for (const key of [
    "actorId",
    "requestId",
    "tokenHash",
    "expectedVersion",
    "number",
  ])
    assert.equal(key in payment, false);
  assert.deepEqual(await state(a), {
    status: "processing",
    version: 4,
    orderStatus: "awaiting_start",
    payments: 1,
    pending: 1,
  });
  assert.deepEqual(
    check(await read(admin, a), 200),
    check(await read(reporter, a), 200),
  );
  check(await create(reporter, a), 409);
  check(await create(reporter, b, input), 409);
  const distinct = await Promise.all(
    Array.from({ length: 8 }, () => create(reporter, b)),
  );
  assert.equal(distinct.filter((r) => r.response.status === 201).length, 1);
  assert.equal(distinct.filter((r) => r.response.status === 409).length, 7);
  const x = await fixtures.orderedTask(tech),
    y = await fixtures.orderedTask(tech),
    shared = cmd();
  const cross = await Promise.all([
    create(reporter, x, shared),
    create(reporter, y, shared),
  ]);
  assert.deepEqual(cross.map((r) => r.response.status).sort(), [201, 409]);
  for (let i = 0; i < 5; i++) {
    const v = await fixtures.orderedTask(tech);
    const r = await Promise.all([create(reporter, v), cancel(reporter, v)]);
    assert.equal(r[1].response.status, 201);
    assert.ok([201, 409].includes(r[0].response.status));
    const record = await state(v);
    assert.equal(record.pending, 0);
    assert.equal(record.orderStatus, "cancelled");
    if (record.payments)
      assert.equal(
        check(await read(reporter, v), 200).payments[0].status,
        "closed",
      );
  }
  check(await cancel(reporter, a), 201);
  const closed = check(await read(reporter, a), 200).payments[0];
  assert.equal(closed.status, "closed");
  assert.equal(closed.closeReason, "order_cancelled");
  assert.ok(closed.closedAt);
  assert.equal(closed.amountCents, payment.amountCents);
  assert.equal(check(await create(reporter, a, input), 201).id, payment.id);
  assert.equal(check(await create(reporter, a, input), 201).status, "closed");
  check(await create(reporter, a), 409);
  const started = await fixtures.orderedTask(tech);
  check(
    await local.request(`/orders/${started.order.id}/start`, {
      cookie: tech.cookie,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: 4 },
    }),
    201,
  );
  check(await create(reporter, started), 409);
  // A payment insert failure leaves the order/ticket and audit untouched.
  const rollback = await fixtures.orderedTask(tech),
    retry = cmd();
  assert.match(rollback.order.id, /^[a-f0-9-]{36}$/);
  await db.query(
    `ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "${constraint}" CHECK ("orderId" <> '${rollback.order.id}')`,
  );
  constrainedTable = "PaymentAttempt";
  check(await create(reporter, rollback, retry), 500);
  assert.equal((await state(rollback)).payments, 0);
  await db.query(
    `ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "${constraint}"`,
  );
  constrainedTable = undefined;
  check(await create(reporter, rollback, retry), 201);
  // Cancellation audit failure must also roll back payment closure.
  await db.query(
    `ALTER TABLE "ServiceOrderCancellation" ADD CONSTRAINT "${constraint}" CHECK ("orderId" <> '${rollback.order.id}')`,
  );
  constrainedTable = "ServiceOrderCancellation";
  check(await cancel(reporter, rollback), 500);
  assert.deepEqual(await state(rollback), {
    status: "processing",
    version: 4,
    orderStatus: "awaiting_start",
    payments: 1,
    pending: 1,
  });
  await db.query(
    `ALTER TABLE "ServiceOrderCancellation" DROP CONSTRAINT "${constraint}"`,
  );
  constrainedTable = undefined;
  check(await cancel(reporter, rollback), 201);
  assert.equal((await state(rollback)).pending, 0);
  await assert.rejects(
    () =>
      db.query('UPDATE "PaymentAttempt" SET "closeReason"=NULL WHERE id=$1', [
        closed.id,
      ]),
    (e) => e.code === "23514",
  );
  await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
    "user-reporter-b",
    a.ticket.id,
  ]);
  try {
    check(await create(reporter, a, input), 404);
    check(await read(reporter, a), 404);
  } finally {
    await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
      "user-reporter-a",
      a.ticket.id,
    ]);
  }
  console.log(
    "Mock payments API: owner-only creation, admin/owner reads and technician denial, server amount snapshot, DTO whitelist, same/distinct/cross-order intent races, cancel-create serialization, closed replay, rollback/retry and current ownership passed.",
  );
} finally {
  if (constrainedTable)
    await db.query(
      `ALTER TABLE "${constrainedTable}" DROP CONSTRAINT "${constraint}"`,
    );
  await fixtures.cleanup();
  await db.end();
}

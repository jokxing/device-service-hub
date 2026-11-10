import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "order.cancel");
const constraint = "cancel_test_" + randomUUID().replaceAll("-", "");
let constrained = false;
const check = (r, s) => {
  assert.equal(r.response.status, s, JSON.stringify(r.value));
  return r.value;
};
const input = (v, patch = {}) => ({
  requestId: randomUUID(),
  expectedVersion: v.ticket.version,
  reason: "维修需求取消，请结束本次服务",
  ...patch,
});
const cancel = (cookie, v, body) =>
  local.request(`/orders/${v.order.id}/cancel`, {
    cookie,
    method: "POST",
    body,
  });
async function state(v) {
  return (
    await db.query(
      'SELECT t.status,t.version,o.status AS "orderStatus",(SELECT COUNT(*)::int FROM "ServiceOrderCancellation" c WHERE c."orderId"=o.id) AS cancellations FROM "Ticket" t JOIN "ServiceOrder" o ON o."ticketId"=t.id WHERE t.id=$1',
      [v.ticket.id],
    )
  ).rows[0];
}
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities(),
    other = await local.login("reporter.b");
  const tech = await fixtures.technician("订单取消验收维修员"),
    otherTech = await fixtures.technician("无权查看取消记录维修员");
  const a = await fixtures.orderedTask(tech),
    b = await fixtures.orderedTask(tech),
    request = input(a);
  check(await cancel(undefined, a, request), 401);
  for (const cookie of [admin, tech.cookie])
    check(await cancel(cookie, a, request), 403);
  check(await cancel(other, a, request), 404);
  for (const patch of [
    { reason: "" },
    { reason: " \n " },
    { reason: "a".repeat(501) },
    { reason: 1 },
    { reason: null },
    { requestId: "bad" },
    { expectedVersion: -1 },
    { expectedVersion: "4" },
    { status: "cancelled" },
    { actorId: "user-admin" },
    { ticketId: a.ticket.id },
    { totalCents: 0 },
  ])
    check(await cancel(reporter, a, input(a, patch)), 400);
  check(await cancel(reporter, a, input(a, { expectedVersion: 3 })), 409);
  check(await cancel(reporter, { order: { id: randomUUID() } }, request), 404);
  for (const status of [
    "pending",
    "assigned",
    "confirming",
    "completed",
    "cancelled",
  ]) {
    await db.query('UPDATE "Ticket" SET status=$1 WHERE id=$2', [
      status,
      b.ticket.id,
    ]);
    check(await cancel(reporter, b, input(b)), 409);
    assert.equal((await state(b)).orderStatus, "awaiting_start");
  }
  await db.query("UPDATE \"Ticket\" SET status='processing' WHERE id=$1", [
    b.ticket.id,
  ]);
  const same = await Promise.all(
    Array.from({ length: 8 }, () =>
      cancel(reporter, a, { ...request, reason: "  " + request.reason + "  " }),
    ),
  );
  for (const r of same) {
    const order = check(r, 201);
    assert.equal(order.id, a.order.id);
    assert.equal(order.status, "cancelled");
    assert.equal(order.cancellation.reason, request.reason);
    assert.equal(order.cancellation.actor.id, "user-reporter-a");
    assert.ok(Number.isFinite(Date.parse(order.cancellation.createdAt)));
    for (const key of ["requestId", "actorId", "expectedVersion"])
      assert.equal(key in order.cancellation, false);
  }
  const {
    status: oldStatus,
    cancellation: oldCancellation,
    ...before
  } = a.order;
  const {
    status: newStatus,
    cancellation: newCancellation,
    ...after
  } = same[0].value;
  assert.deepEqual(after, before);
  assert.deepEqual(await state(a), {
    status: "cancelled",
    version: 5,
    orderStatus: "cancelled",
    cancellations: 1,
  });
  for (const cookie of [reporter, admin, tech.cookie])
    assert.deepEqual(
      check(
        await local.request(`/orders/by-ticket/${a.ticket.id}`, { cookie }),
        200,
      ).order,
      same[0].value,
    );
  check(
    await local.request(`/orders/by-ticket/${a.ticket.id}`, {
      cookie: otherTech.cookie,
    }),
    404,
  );
  assert.deepEqual(
    check(
      await local.request(`/tickets/${a.ticket.id}/quote`, {
        cookie: reporter,
      }),
      200,
    ).quote,
    a.quote,
  );
  check(await cancel(reporter, a, { ...request, reason: "不同原因" }), 409);
  check(await cancel(reporter, b, request), 409);
  check(await cancel(reporter, a, { ...request, expectedVersion: 5 }), 409);
  check(await cancel(reporter, a, input(a)), 409);
  const replay = check(
    await local.request(`/tickets/${a.ticket.id}/quote/accept`, {
      cookie: reporter,
      method: "POST",
      body: a.acceptanceInput,
    }),
    201,
  );
  assert.equal(replay.id, a.order.id);
  assert.equal(replay.status, "cancelled");
  check(
    await local.request(`/tickets/${a.ticket.id}/quote/accept`, {
      cookie: reporter,
      method: "POST",
      body: {
        ...a.acceptanceInput,
        requestId: randomUUID(),
        expectedVersion: 5,
      },
    }),
    409,
  );
  check(
    await local.request(`/tasks/${a.ticket.id}/result`, {
      cookie: tech.cookie,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 5,
        description: "不能继续维修",
      },
    }),
    409,
  );
  const distinct = await Promise.all(
    Array.from({ length: 8 }, () => cancel(reporter, b, input(b))),
  );
  assert.equal(distinct.filter((r) => r.response.status === 201).length, 1);
  assert.equal(distinct.filter((r) => r.response.status === 409).length, 7);
  const rollback = await fixtures.orderedTask(tech),
    rollbackInput = input(rollback);
  assert.match(rollback.order.id, /^[a-f0-9-]{36}$/);
  await db.query(
    `ALTER TABLE "ServiceOrderCancellation" ADD CONSTRAINT "${constraint}" CHECK ("orderId" <> '${rollback.order.id}')`,
  );
  constrained = true;
  check(await cancel(reporter, rollback, rollbackInput), 500);
  assert.deepEqual(await state(rollback), {
    status: "processing",
    version: 4,
    orderStatus: "awaiting_start",
    cancellations: 0,
  });
  await db.query(
    `ALTER TABLE "ServiceOrderCancellation" DROP CONSTRAINT "${constraint}"`,
  );
  constrained = false;
  check(await cancel(reporter, rollback, rollbackInput), 201);
  await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
    "user-reporter-b",
    a.ticket.id,
  ]);
  try {
    check(await cancel(reporter, a, request), 404);
  } finally {
    await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
      "user-reporter-a",
      a.ticket.id,
    ]);
  }
  console.log(
    "Order cancellations API: owner/DTO/state checks, normalized reason, same/distinct-intent concurrency, ticket/order/audit atomicity, immutable snapshot/quote, rollback/retry, acceptance replay, result gate and current-ownership checks passed.",
  );
} finally {
  if (constrained)
    await db.query(
      `ALTER TABLE "ServiceOrderCancellation" DROP CONSTRAINT "${constraint}"`,
    );
  await fixtures.cleanup();
  await db.end();
}

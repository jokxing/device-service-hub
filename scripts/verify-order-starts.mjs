import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "order.start");
const constraint = "start_test_" + randomUUID().replaceAll("-", "");
let constrained = false;
const check = (r, s) => {
  assert.equal(r.response.status, s, JSON.stringify(r.value));
  return r.value;
};
const command = (v) => ({
  requestId: randomUUID(),
  expectedVersion: v.ticket.version,
});
const start = (cookie, v, body) =>
  local.request(`/orders/${v.order.id}/start`, {
    cookie,
    method: "POST",
    body,
  });
const cancel = (cookie, v) =>
  local.request(`/orders/${v.order.id}/cancel`, {
    cookie,
    method: "POST",
    body: { ...command(v), reason: "开工前取消需求" },
  });
async function state(v) {
  return (
    await db.query(
      'SELECT t.status,t.version,o.status AS "orderStatus",(SELECT COUNT(*)::int FROM "ServiceOrderStart" s WHERE s."orderId"=o.id) AS starts,(SELECT COUNT(*)::int FROM "ServiceOrderCancellation" c WHERE c."orderId"=o.id) AS cancellations FROM "Ticket" t JOIN "ServiceOrder" o ON o."ticketId"=t.id WHERE t.id=$1',
      [v.ticket.id],
    )
  ).rows[0];
}
const snapshot = ({ status, start, ...rest }) => rest;
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities();
  const tech = await fixtures.technician("开工验收维修员"),
    other = await fixtures.technician("非分派维修员");
  const a = await fixtures.orderedTask(tech),
    b = await fixtures.orderedTask(tech),
    input = command(a);
  check(await start(undefined, a, input), 401);
  for (const cookie of [reporter, admin])
    check(await start(cookie, a, input), 403);
  check(await start(other.cookie, a, input), 404);
  for (const patch of [
    { expectedVersion: -1 },
    { expectedVersion: "4" },
    { requestId: "bad" },
    { actorId: tech.id },
    { status: "in_progress" },
    { totalCents: 1 },
  ])
    check(await start(tech.cookie, a, { ...input, ...patch }), 400);
  check(await start(tech.cookie, a, { ...input, expectedVersion: 3 }), 409);
  check(await start(tech.cookie, { order: { id: randomUUID() } }, input), 404);
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
    check(await start(tech.cookie, b, command(b)), 409);
  }
  await db.query("UPDATE \"Ticket\" SET status='processing' WHERE id=$1", [
    b.ticket.id,
  ]);
  check(
    await local.request(`/tasks/${a.ticket.id}/result`, {
      cookie: tech.cookie,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 4,
        description: "订单未开工不能提交结果",
      },
    }),
    409,
  );
  const same = await Promise.all(
    Array.from({ length: 8 }, () => start(tech.cookie, a, input)),
  );
  const opened = same.map((r) => check(r, 201));
  for (const value of opened) assert.deepEqual(value, opened[0]);
  assert.equal(opened[0].status, "in_progress");
  assert.deepEqual(snapshot(opened[0]), snapshot(a.order));
  assert.deepEqual(Object.keys(opened[0].start).sort(), ["actor", "createdAt"]);
  assert.equal(opened[0].start.actor.id, tech.id);
  assert.ok(!Number.isNaN(Date.parse(opened[0].start.createdAt)));
  assert.deepEqual(await state(a), {
    status: "processing",
    version: 5,
    orderStatus: "in_progress",
    starts: 1,
    cancellations: 0,
  });
  for (const cookie of [reporter, admin, tech.cookie])
    assert.deepEqual(
      check(
        await local.request(`/orders/by-ticket/${a.ticket.id}`, { cookie }),
        200,
      ).order,
      opened[0],
    );
  check(
    await local.request(`/orders/by-ticket/${a.ticket.id}`, {
      cookie: other.cookie,
    }),
    404,
  );
  check(await start(tech.cookie, a, { ...input, expectedVersion: 5 }), 409);
  check(await start(tech.cookie, b, input), 409);
  check(await start(tech.cookie, a, command(a)), 409);
  check(
    await cancel(reporter, { ...a, ticket: { ...a.ticket, version: 5 } }),
    409,
  );
  const oldAccept = check(
    await local.request(`/tickets/${a.ticket.id}/quote/accept`, {
      cookie: reporter,
      method: "POST",
      body: a.acceptanceInput,
    }),
    201,
  );
  assert.equal(oldAccept.status, "in_progress");
  assert.equal(oldAccept.id, a.order.id);
  const distinct = await Promise.all(
    Array.from({ length: 8 }, () => start(tech.cookie, b, command(b))),
  );
  assert.equal(distinct.filter((r) => r.response.status === 201).length, 1);
  assert.equal(distinct.filter((r) => r.response.status === 409).length, 7);
  const cancelled = await fixtures.orderedTask(tech);
  check(await cancel(reporter, cancelled), 201);
  check(await start(tech.cookie, cancelled, command(cancelled)), 409);
  for (let i = 0; i < 6; i++) {
    const v = await fixtures.orderedTask(tech);
    const results = await Promise.all([
      start(tech.cookie, v, command(v)),
      cancel(reporter, v),
    ]);
    assert.deepEqual(results.map((r) => r.response.status).sort(), [201, 409]);
    const actual = await state(v);
    assert.equal(actual.version, 5);
    assert.equal(actual.starts + actual.cancellations, 1);
    assert.deepEqual(
      [actual.status, actual.orderStatus],
      actual.starts
        ? ["processing", "in_progress"]
        : ["cancelled", "cancelled"],
    );
  }
  const rollback = await fixtures.orderedTask(tech),
    retry = command(rollback);
  assert.match(rollback.order.id, /^[a-f0-9-]{36}$/);
  await db.query(
    `ALTER TABLE "ServiceOrderStart" ADD CONSTRAINT "${constraint}" CHECK ("orderId" <> '${rollback.order.id}')`,
  );
  constrained = true;
  check(await start(tech.cookie, rollback, retry), 500);
  assert.deepEqual(await state(rollback), {
    status: "processing",
    version: 4,
    orderStatus: "awaiting_start",
    starts: 0,
    cancellations: 0,
  });
  await db.query(
    `ALTER TABLE "ServiceOrderStart" DROP CONSTRAINT "${constraint}"`,
  );
  constrained = false;
  check(await start(tech.cookie, rollback, retry), 201);
  await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE id=$2', [
    other.id,
    a.ticket.id,
  ]);
  try {
    check(await start(tech.cookie, a, input), 404);
  } finally {
    await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE id=$2', [
      tech.id,
      a.ticket.id,
    ]);
  }
  console.log(
    "Order starts API: role/current-assignee/DTO/state guards, same/distinct intent concurrency, start-cancel competition, audit rollback/retry, immutable snapshot, exact acceptance replay and current scope passed.",
  );
} finally {
  if (constrained)
    await db.query(
      `ALTER TABLE "ServiceOrderStart" DROP CONSTRAINT "${constraint}"`,
    );
  await fixtures.cleanup();
  await db.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "order.fulfill");
const constraint = "fulfill_test_" + randomUUID().replaceAll("-", "");
let constrainedTable;
const check = (r, s) => {
  assert.equal(r.response.status, s, JSON.stringify(r.value));
  return r.value;
};
const command = (v, version) => ({
  requestId: randomUUID(),
  expectedVersion: version ?? v.ticket.version,
});
const resultInput = (v) => ({
  ...command(v, 5),
  description: "更换接线端子。\n试运行30分钟正常。",
});
const submit = (cookie, v, input) =>
  local.request(`/tasks/${v.ticket.id}/result`, {
    cookie,
    method: "POST",
    body: input,
  });
const confirm = (cookie, v, input) =>
  local.request(`/tickets/${v.ticket.id}/confirm`, {
    cookie,
    method: "POST",
    body: input,
  });
async function state(v) {
  return (
    await db.query(
      'SELECT t.status,t.version,o.status AS "orderStatus",(SELECT COUNT(*)::int FROM "TicketResult" r WHERE r."ticketId"=t.id) AS results,(SELECT COUNT(*)::int FROM "TicketConfirmation" c WHERE c."ticketId"=t.id) AS confirmations FROM "Ticket" t JOIN "ServiceOrder" o ON o."ticketId"=t.id WHERE t.id=$1',
      [v.ticket.id],
    )
  ).rows[0];
}
async function opened(tech) {
  const v = await fixtures.orderedTask(tech);
  v.order = check(
    await local.request(`/orders/${v.order.id}/start`, {
      cookie: tech.cookie,
      method: "POST",
      body: command(v),
    }),
    201,
  );
  return v;
}
const immutable = ({ status, ...rest }) => rest;
async function forceAuditFailure(table, v, operation, expected) {
  assert.match(v.ticket.id, /^[a-f0-9-]{36}$/);
  await db.query(
    `ALTER TABLE "${table}" ADD CONSTRAINT "${constraint}" CHECK ("ticketId" <> '${v.ticket.id}')`,
  );
  constrainedTable = table;
  check(await operation(), 500);
  assert.deepEqual(await state(v), expected);
  await db.query(`ALTER TABLE "${table}" DROP CONSTRAINT "${constraint}"`);
  constrainedTable = undefined;
  check(await operation(), 201);
}
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities(),
    reporterB = await local.login("reporter.b");
  const tech = await fixtures.technician("履约维修员"),
    other = await fixtures.technician("非分派维修员");
  const unstarted = await fixtures.orderedTask(tech);
  check(
    await submit(tech.cookie, unstarted, {
      ...resultInput(unstarted),
      expectedVersion: 4,
    }),
    409,
  );
  const a = await opened(tech),
    input = resultInput(a),
    confirmation = command(a, 6);
  check(await submit(undefined, a, input), 401);
  for (const cookie of [reporter, admin])
    check(await submit(cookie, a, input), 403);
  check(await submit(other.cookie, a, input), 404);
  for (const patch of [
    { description: " " },
    { description: "a".repeat(2001) },
    { actorId: tech.id },
    { status: "confirming" },
    { expectedVersion: "5" },
  ])
    check(await submit(tech.cookie, a, { ...input, ...patch }), 400);
  check(await submit(tech.cookie, a, { ...input, expectedVersion: 4 }), 409);
  check(await confirm(reporter, a, confirmation), 409);
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      submit(tech.cookie, a, {
        ...input,
        description: "  " + input.description + "  ",
      }),
    ),
  );
  for (const r of results) assert.deepEqual(check(r, 201), results[0].value);
  assert.deepEqual(await state(a), {
    status: "confirming",
    version: 6,
    orderStatus: "awaiting_confirmation",
    results: 1,
    confirmations: 0,
  });
  const awaiting = check(
    await local.request(`/orders/by-ticket/${a.ticket.id}`, {
      cookie: reporter,
    }),
    200,
  ).order;
  assert.deepEqual(immutable(awaiting), immutable(a.order));
  check(
    await submit(tech.cookie, a, { ...input, description: "不同说明" }),
    409,
  );
  check(
    await submit(tech.cookie, a, { ...input, requestId: randomUUID() }),
    409,
  );
  for (const cookie of [admin, tech.cookie])
    check(await confirm(cookie, a, confirmation), 403);
  check(await confirm(reporterB, a, confirmation), 404);
  check(
    await confirm(reporter, a, { ...confirmation, expectedVersion: 5 }),
    409,
  );
  for (const status of [
    "awaiting_start",
    "in_progress",
    "cancelled",
    "completed",
  ]) {
    await db.query('UPDATE "ServiceOrder" SET status=$1 WHERE id=$2', [
      status,
      a.order.id,
    ]);
    check(await confirm(reporter, a, confirmation), 409);
    assert.equal((await state(a)).status, "confirming");
  }
  await db.query(
    "UPDATE \"ServiceOrder\" SET status='awaiting_confirmation' WHERE id=$1",
    [a.order.id],
  );
  const decisions = await Promise.all(
    Array.from({ length: 8 }, () => confirm(reporter, a, confirmation)),
  );
  for (const r of decisions)
    assert.deepEqual(check(r, 201), decisions[0].value);
  assert.deepEqual(await state(a), {
    status: "completed",
    version: 7,
    orderStatus: "completed",
    results: 1,
    confirmations: 1,
  });
  const completed = check(
    await local.request(`/orders/by-ticket/${a.ticket.id}`, {
      cookie: reporter,
    }),
    200,
  ).order;
  assert.deepEqual(immutable(completed), immutable(a.order));
  for (const cookie of [admin, reporter, tech.cookie])
    assert.deepEqual(
      check(
        await local.request(`/orders/by-ticket/${a.ticket.id}`, { cookie }),
        200,
      ).order,
      completed,
    );
  const reread = check(await submit(tech.cookie, a, input), 201);
  assert.equal(reread.status, "completed");
  assert.equal(reread.result.description, input.description);
  assert.deepEqual(
    check(await confirm(reporter, a, confirmation), 201).confirmation,
    decisions[0].value.confirmation,
  );
  check(
    await confirm(reporter, a, { ...confirmation, requestId: randomUUID() }),
    409,
  );
  const accepted = check(
    await local.request(`/tickets/${a.ticket.id}/quote/accept`, {
      cookie: reporter,
      method: "POST",
      body: a.acceptanceInput,
    }),
    201,
  );
  assert.equal(accepted.status, "completed");
  check(
    await local.request(`/orders/${a.order.id}/cancel`, {
      cookie: reporter,
      method: "POST",
      body: { ...command(a, 7), reason: "完成后不能取消" },
    }),
    409,
  );
  const b = await opened(tech);
  const writes = await Promise.all(
    Array.from({ length: 8 }, () => submit(tech.cookie, b, resultInput(b))),
  );
  assert.equal(writes.filter((r) => r.response.status === 201).length, 1);
  assert.equal(writes.filter((r) => r.response.status === 409).length, 7);
  const confirms = await Promise.all(
    Array.from({ length: 8 }, () => confirm(reporter, b, command(b, 6))),
  );
  assert.equal(confirms.filter((r) => r.response.status === 201).length, 1);
  assert.equal(confirms.filter((r) => r.response.status === 409).length, 7);
  const rollback = await opened(tech),
    rinput = resultInput(rollback),
    cinput = command(rollback, 6);
  await forceAuditFailure(
    "TicketResult",
    rollback,
    () => submit(tech.cookie, rollback, rinput),
    {
      status: "processing",
      version: 5,
      orderStatus: "in_progress",
      results: 0,
      confirmations: 0,
    },
  );
  await forceAuditFailure(
    "TicketConfirmation",
    rollback,
    () => confirm(reporter, rollback, cinput),
    {
      status: "confirming",
      version: 6,
      orderStatus: "awaiting_confirmation",
      results: 1,
      confirmations: 0,
    },
  );
  await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE id=$2', [
    other.id,
    a.ticket.id,
  ]);
  try {
    check(await submit(tech.cookie, a, input), 404);
  } finally {
    await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE id=$2', [
      tech.id,
      a.ticket.id,
    ]);
  }
  await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
    "user-reporter-b",
    a.ticket.id,
  ]);
  try {
    check(await confirm(reporter, a, confirmation), 404);
  } finally {
    await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
      "user-reporter-a",
      a.ticket.id,
    ]);
  }
  console.log(
    "Order fulfillment API: required start, roles/ownership/DTO/version, exact and distinct intent races, ticket-order-result/confirmation atomicity, rollback/retry, immutable snapshots, terminal replay and current scope passed.",
  );
} finally {
  if (constrainedTable)
    await db.query(
      `ALTER TABLE "${constrainedTable}" DROP CONSTRAINT "${constraint}"`,
    );
  await fixtures.cleanup();
  await db.end();
}

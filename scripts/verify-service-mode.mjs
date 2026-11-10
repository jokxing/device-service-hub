import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "service.mode");
const constraint = "mode_test_" + randomUUID().replaceAll("-", "");
let constrained = false;
const check = (r, status) => {
  assert.equal(r.response.status, status, JSON.stringify(r.value));
  return r.value;
};
const command = (ticket, patch = {}) => ({
  requestId: randomUUID(),
  expectedVersion: ticket.version,
  reason: "首次分派误选，维修需要报价确认",
  ...patch,
});
const change = (cookie, ticket, input = command(ticket)) =>
  local.request(`/admin/tickets/${ticket.id}/require-quote`, {
    cookie,
    method: "POST",
    body: input,
  });
async function state(ticket) {
  return (
    await db.query(
      'SELECT "serviceMode", "version", "status", (SELECT count(*)::int FROM "TicketServiceModeChange" WHERE "ticketId"=t.id) AS changes FROM "Ticket" t WHERE id=$1',
      [ticket.id],
    )
  ).rows[0];
}
try {
  await local.waitForApi();
  const { admin, reporter } = await fixtures.identities();
  const tech = await fixtures.technician("服务方式验收维修员");
  const a = await fixtures.task(tech),
    input = command(a);
  check(await change(undefined, a, input), 401);
  for (const cookie of [reporter, tech.cookie])
    check(await change(cookie, a, input), 403);
  for (const patch of [
    { reason: "  " },
    { reason: "x".repeat(501) },
    { expectedVersion: -1 },
    { requestId: "invalid" },
    { serviceMode: "direct" },
  ])
    check(await change(admin, a, { ...input, ...patch }), 400);
  check(await change(admin, { ...a, id: randomUUID() }, input), 404);
  check(await change(admin, a, { ...input, expectedVersion: 0 }), 409);
  const assignment = (
    await db.query(
      'SELECT to_jsonb(t) AS value FROM "TicketAssignment" t WHERE "ticketId"=$1',
      [a.id],
    )
  ).rows[0].value;
  const results = await Promise.all(
    Array.from({ length: 8 }, () => change(admin, a, input)),
  );
  results.forEach((r) => check(r, 201));
  assert.deepEqual(await state(a), {
    serviceMode: "quoted",
    version: 3,
    status: "processing",
    changes: 1,
  });
  assert.equal(results[0].value.serviceModeChange.reason, input.reason);
  assert.deepEqual(
    (
      await db.query(
        'SELECT to_jsonb(t) AS value FROM "TicketAssignment" t WHERE "ticketId"=$1',
        [a.id],
      )
    ).rows[0].value,
    assignment,
  );
  check(await change(admin, a, { ...input, reason: "不同原因" }), 409);
  check(await change(admin, a), 409);
  check(
    await local.request(`/tasks/${a.id}/result`, {
      cookie: tech.cookie,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 3,
        description: "不能绕过报价",
      },
    }),
    409,
  );
  const quote = check(
    await local.request(`/tickets/${a.id}/quote`, {
      cookie: tech.cookie,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 3,
        items: [
          { name: "检测维修", quantity: 1, unitPriceCents: 12050, note: "" },
        ],
      },
    }),
    201,
  );
  check(
    await local.request(`/tickets/${a.id}/quote/accept`, {
      cookie: reporter,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 4,
        quoteId: quote.id,
        quoteRevision: quote.revision,
      },
    }),
    201,
  );
  check(await change(admin, a, input), 201); // A replay reads current state, never reverts it.
  assert.equal((await state(a)).version, 5);
  const assigned = await fixtures.task(tech, { stage: "assigned" });
  const fixed = check(await change(admin, assigned), 201);
  assert.equal(fixed.status, "assigned");
  assert.equal(fixed.assignee.id, tech.id);
  check(
    await local.request(`/tasks/${assigned.id}/accept`, {
      cookie: tech.cookie,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: 1 },
    }),
    409,
  );
  check(
    await local.request(`/tasks/${assigned.id}/accept`, {
      cookie: tech.cookie,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: 2 },
    }),
    201,
  );
  const pending = await fixtures.task(tech, { stage: "pending" });
  check(await change(admin, { ...pending, version: 0 }), 409);
  const confirming = await fixtures.task(tech, { stage: "confirming" });
  check(await change(admin, confirming), 409);
  const quoted = await fixtures.quotedTask(tech),
    ordered = await fixtures.orderedTask(tech);
  check(await change(admin, quoted.ticket), 409);
  check(await change(admin, ordered.ticket), 409);
  for (let i = 0; i < 4; i++) {
    const ticket = await fixtures.task(tech);
    const race = await Promise.all([
      change(admin, ticket),
      local.request(`/tasks/${ticket.id}/result`, {
        cookie: tech.cookie,
        method: "POST",
        body: {
          requestId: randomUUID(),
          expectedVersion: ticket.version,
          description: "原直接处理结果",
        },
      }),
    ]);
    assert.deepEqual(race.map((r) => r.response.status).sort(), [201, 409]);
    const actual = await state(ticket);
    assert.equal(actual.version, 3);
    assert.deepEqual(
      [actual.serviceMode, actual.status, actual.changes],
      race[0].response.status === 201
        ? ["quoted", "processing", 1]
        : ["direct", "confirming", 0],
    );
  }
  const competition = await fixtures.task(tech);
  const distinct = await Promise.all(
    Array.from({ length: 6 }, () => change(admin, competition)),
  );
  assert.equal(distinct.filter((r) => r.response.status === 201).length, 1);
  assert.equal(distinct.filter((r) => r.response.status === 409).length, 5);
  const rollback = await fixtures.task(tech),
    retry = command(rollback);
  await db.query(
    `ALTER TABLE "TicketServiceModeChange" ADD CONSTRAINT "${constraint}" CHECK ("ticketId" <> '${rollback.id}')`,
  );
  constrained = true;
  check(await change(admin, rollback, retry), 500);
  assert.deepEqual(await state(rollback), {
    serviceMode: "direct",
    version: 2,
    status: "processing",
    changes: 0,
  });
  await db.query(
    `ALTER TABLE "TicketServiceModeChange" DROP CONSTRAINT "${constraint}"`,
  );
  constrained = false;
  check(await change(admin, rollback, retry), 201);
  console.log(
    "Service mode API: role/DTO/state guards, assigned and processing corrections, immutable assignment, exact replay, competing commands, result race, audit rollback and subsequent quote/order flow passed.",
  );
} finally {
  if (constrained)
    await db.query(
      `ALTER TABLE "TicketServiceModeChange" DROP CONSTRAINT "${constraint}"`,
    );
  await fixtures.cleanup();
  await db.end();
}

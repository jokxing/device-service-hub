import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "quote.revision");
const constraint = "revision_test_" + randomUUID().replaceAll("-", "");
let constraintAdded = false;
const check = (r, status) => {
  assert.equal(r.response.status, status, JSON.stringify(r.value));
  return r.value;
};
const items = [
  {
    name: "更换控制板",
    quantity: 2,
    unitPriceCents: 8850,
    note: "调整维修方案",
  },
];
const command = (v, patch = {}) => ({
  requestId: randomUUID(),
  expectedVersion: v.ticket.version,
  baseQuoteId: v.quote.id,
  baseQuoteRevision: v.quote.revision,
  items,
  ...patch,
});
const revision = (cookie, v, input) =>
  local.request(`/tickets/${v.ticket.id}/quote/revisions`, {
    cookie,
    method: "POST",
    body: input,
  });
const history = (cookie, v) =>
  local.request(`/tickets/${v.ticket.id}/quote/history`, { cookie });
async function reject(cookie, v, reason = "预算不足") {
  const input = {
    requestId: randomUUID(),
    expectedVersion: v.ticket.version,
    quoteId: v.quote.id,
    quoteRevision: v.quote.revision,
    reason,
  };
  const quote = check(
    await local.request(`/tickets/${v.ticket.id}/quote/reject`, {
      cookie,
      method: "POST",
      body: input,
    }),
    201,
  );
  return {
    ticket: { ...v.ticket, version: v.ticket.version + 1 },
    quote,
    input,
  };
}
async function version(v) {
  return (
    await db.query('SELECT "version" FROM "Ticket" WHERE "id"=$1', [
      v.ticket.id,
    ])
  ).rows[0].version;
}
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities(),
    otherReporter = await local.login("reporter.b");
  const tech = await fixtures.technician("报价修订验收维修员"),
    otherTech = await fixtures.technician("无权修订维修员");
  const first = await fixtures.quotedTask(tech),
    pending = await fixtures.quotedTask(tech);
  const firstCommand = (
    await db.query(
      'SELECT "requestId","expectedVersion" FROM "TicketQuote" WHERE "id"=$1',
      [first.quote.id],
    )
  ).rows[0];
  const a = await reject(reporter, first),
    input = command(a);
  check(await revision(undefined, a, input), 401);
  for (const cookie of [admin, reporter, otherReporter])
    check(await revision(cookie, a, input), 403);
  check(await revision(otherTech.cookie, a, input), 404);
  check(await history(otherReporter, a), 404);
  check(await history(otherTech.cookie, a), 404);
  check(await history(undefined, a), 401);
  check(await revision(tech.cookie, pending, command(pending)), 409);
  for (const patch of [
    { baseQuoteId: "bad" },
    { baseQuoteRevision: 0 },
    { baseQuoteRevision: "1" },
    { baseQuoteRevision: 2147483646 },
    { baseQuoteId: undefined },
    { expectedVersion: -1 },
    { items: [] },
    { items: [{ ...items[0], unitPriceCents: 0.1 }] },
    { totalCents: 1 },
    { revision: 2 },
    { actorId: tech.id },
  ])
    check(await revision(tech.cookie, a, command(a, patch)), 400);
  for (const patch of [
    { baseQuoteId: pending.quote.id },
    { baseQuoteRevision: 2 },
    { expectedVersion: 3 },
  ])
    check(await revision(tech.cookie, a, command(a, patch)), 409);
  const same = await Promise.all(
    Array.from({ length: 8 }, () => revision(tech.cookie, a, input)),
  );
  const second = check(same[0], 201);
  for (const result of same) assert.equal(check(result, 201).id, second.id);
  assert.equal(second.revision, 2);
  assert.equal(second.status, "pending");
  assert.equal(second.totalCents, 17700);
  assert.equal(second.rejection, null);
  assert.equal(await version(a), 5);
  for (const cookie of [reporter, admin, tech.cookie]) {
    const quotes = check(await history(cookie, a), 200).quotes;
    assert.deepEqual(
      quotes.map((q) => q.revision),
      [2, 1],
    );
    assert.deepEqual(quotes[1], a.quote);
    for (const quote of quotes)
      for (const key of [
        "requestId",
        "requestHash",
        "expectedVersion",
        "actorId",
      ])
        assert.equal(key in quote, false);
  }
  assert.equal(
    check(
      await local.request(`/tickets/${a.ticket.id}/quote`, {
        cookie: reporter,
      }),
      200,
    ).quote.id,
    second.id,
  );
  check(
    await revision(tech.cookie, a, {
      ...input,
      items: [{ ...items[0], quantity: 3 }],
    }),
    409,
  );
  check(
    await revision(tech.cookie, a, { ...input, baseQuoteId: pending.quote.id }),
    409,
  );
  check(await revision(tech.cookie, a, command(a)), 409);
  const oldReplay = check(
    await local.request(`/tickets/${a.ticket.id}/quote`, {
      cookie: tech.cookie,
      method: "POST",
      body: {
        ...firstCommand,
        items: first.quote.items.map(({ amountCents, ...item }) => item),
      },
    }),
    201,
  );
  assert.equal(oldReplay.id, first.quote.id);
  assert.equal(oldReplay.revision, 1);
  assert.equal(oldReplay.status, "rejected");
  const lateReject = check(
    await local.request(`/tickets/${a.ticket.id}/quote/reject`, {
      cookie: reporter,
      method: "POST",
      body: a.input,
    }),
    201,
  );
  assert.equal(lateReject.id, first.quote.id);
  check(
    await local.request(`/tickets/${a.ticket.id}/quote/accept`, {
      cookie: reporter,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 5,
        quoteId: first.quote.id,
        quoteRevision: 1,
      },
    }),
    409,
  );
  const b = await reject(
    reporter,
    { ticket: { ...a.ticket, version: 5 }, quote: second },
    "请再次调整数量",
  );
  const distinct = await Promise.all(
    Array.from({ length: 8 }, () => revision(tech.cookie, b, command(b))),
  );
  assert.equal(distinct.filter((r) => r.response.status === 201).length, 1);
  assert.equal(distinct.filter((r) => r.response.status === 409).length, 7);
  const third = distinct.find((r) => r.response.status === 201).value;
  assert.equal(third.revision, 3);
  assert.equal(await version(b), 7);
  assert.equal(check(await revision(tech.cookie, a, input), 201).id, second.id);
  assert.equal(
    check(await revision(tech.cookie, a, input), 201).status,
    "rejected",
  );
  const order = check(
    await local.request(`/tickets/${a.ticket.id}/quote/accept`, {
      cookie: reporter,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 7,
        quoteId: third.id,
        quoteRevision: 3,
      },
    }),
    201,
  );
  assert.equal(order.quoteRevision, 3);
  assert.equal(order.quoteId, third.id);
  assert.equal(order.totalCents, 17700);
  assert.deepEqual(order.items, third.items);
  check(
    await revision(tech.cookie, b, command(b, { expectedVersion: 8 })),
    409,
  );
  const saved = check(await history(reporter, a), 200).quotes;
  assert.deepEqual(
    saved.map((q) => q.status),
    ["accepted", "rejected", "rejected"],
  );
  assert.deepEqual(saved[2], a.quote);
  assert.deepEqual(saved[1], b.quote);
  const rollback = await reject(reporter, await fixtures.quotedTask(tech)),
    rollbackInput = command(rollback);
  assert.match(rollback.ticket.id, /^[a-f0-9-]{36}$/);
  await db.query(
    `ALTER TABLE "TicketQuote" ADD CONSTRAINT "${constraint}" CHECK ("ticketId" <> '${rollback.ticket.id}' OR revision <> 2)`,
  );
  constraintAdded = true;
  check(await revision(tech.cookie, rollback, rollbackInput), 500);
  assert.equal(await version(rollback), 4);
  assert.deepEqual(check(await history(reporter, rollback), 200).quotes, [
    rollback.quote,
  ]);
  await db.query(`ALTER TABLE "TicketQuote" DROP CONSTRAINT "${constraint}"`);
  constraintAdded = false;
  check(await revision(tech.cookie, rollback, rollbackInput), 201);
  await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE "id"=$2', [
    otherTech.id,
    a.ticket.id,
  ]);
  try {
    check(await revision(tech.cookie, a, input), 404);
    check(await history(tech.cookie, a), 404);
  } finally {
    await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE "id"=$2', [
      tech.id,
      a.ticket.id,
    ]);
  }
  console.log(
    "Quote revisions API: exact rejected base/role scope, DTO and money validation, same/distinct intent competition, immutable history, exact old replay, v3 acceptance/snapshot, rollback/retry and current-assignee checks passed.",
  );
} finally {
  if (constraintAdded)
    await db.query(`ALTER TABLE "TicketQuote" DROP CONSTRAINT "${constraint}"`);
  await fixtures.cleanup();
  await db.end();
}

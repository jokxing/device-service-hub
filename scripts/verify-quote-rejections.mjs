import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "quote.reject");
const constraint = "rejection_test_" + randomUUID().replaceAll("-", "");
let constraintAdded = false;
const check = (result, status) => {
  assert.equal(result.response.status, status, JSON.stringify(result.value));
  return result.value;
};
const inputFor = (value, patch = {}) => ({
  requestId: randomUUID(),
  expectedVersion: value.ticket.version,
  quoteId: value.quote.id,
  quoteRevision: value.quote.revision,
  reason: "价格超出预算，请核对维修方案",
  ...patch,
});
const decide = (action, cookie, value, input) =>
  local.request(`/tickets/${value.ticket.id}/quote/${action}`, {
    cookie,
    method: "POST",
    body: input,
  });
async function state(value) {
  return (
    await db.query(
      'SELECT t."version",t."status",q."status" AS "quoteStatus", (SELECT COUNT(*)::int FROM "QuoteRejection" r WHERE r."quoteId"=q."id") AS rejections, (SELECT COUNT(*)::int FROM "ServiceOrder" o WHERE o."ticketId"=t."id") AS orders FROM "Ticket" t JOIN "TicketQuote" q ON q."ticketId"=t."id" WHERE t."id"=$1',
      [value.ticket.id],
    )
  ).rows[0];
}
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities();
  const other = await local.login("reporter.b");
  const tech = await fixtures.technician("报价拒绝验收维修员");
  const a = await fixtures.quotedTask(tech),
    b = await fixtures.quotedTask(tech);
  const input = inputFor(a);
  check(await decide("reject", undefined, a, input), 401);
  for (const cookie of [admin, tech.cookie])
    check(await decide("reject", cookie, a, input), 403);
  check(await decide("reject", other, a, input), 404);
  for (const patch of [
    { reason: "" },
    { reason: " \n " },
    { reason: "a".repeat(501) },
    { reason: 1 },
    { reason: null },
    { quoteId: "bad" },
    { quoteRevision: 0 },
    { quoteRevision: "1" },
    { expectedVersion: -1 },
    { requestId: "bad" },
    { actorId: "user-admin" },
    { status: "rejected" },
  ]) {
    check(await decide("reject", reporter, a, inputFor(a, patch)), 400);
  }
  for (const patch of [
    { expectedVersion: 2 },
    { quoteRevision: 2 },
    { quoteId: b.quote.id },
  ]) {
    check(await decide("reject", reporter, a, inputFor(a, patch)), 409);
  }
  const results = await Promise.all(
    Array.from({ length: 8 }, () =>
      decide("reject", reporter, a, {
        ...input,
        reason: "  " + input.reason + "  ",
      }),
    ),
  );
  for (const result of results) {
    const quote = check(result, 201);
    assert.equal(quote.status, "rejected");
    assert.deepEqual(quote.items, a.quote.items);
    assert.equal(quote.totalCents, a.quote.totalCents);
    assert.equal(quote.rejection.reason, input.reason);
    assert.equal(quote.rejection.actor.id, "user-reporter-a");
    assert.ok(Number.isFinite(Date.parse(quote.rejection.createdAt)));
    for (const key of ["requestId", "expectedVersion", "actorId"])
      assert.equal(key in quote.rejection, false);
  }
  assert.deepEqual(await state(a), {
    version: 4,
    status: "processing",
    quoteStatus: "rejected",
    rejections: 1,
    orders: 0,
  });
  for (const cookie of [reporter, admin, tech.cookie]) {
    const read = check(
      await local.request(`/tickets/${a.ticket.id}/quote`, { cookie }),
      200,
    ).quote;
    assert.deepEqual(read.rejection, results[0].value.rejection);
  }
  check(
    await decide("reject", reporter, a, { ...input, reason: "不同原因" }),
    409,
  );
  check(
    await decide("reject", reporter, a, { ...input, expectedVersion: 4 }),
    409,
  );
  check(
    await decide("reject", reporter, b, { ...input, quoteId: b.quote.id }),
    409,
  );
  check(await decide("reject", reporter, a, inputFor(a)), 409);
  const { reason, ...acceptInput } = input;
  check(await decide("accept", reporter, a, acceptInput), 409);
  const distinct = await Promise.all(
    Array.from({ length: 8 }, () => decide("reject", reporter, b, inputFor(b))),
  );
  assert.equal(distinct.filter((r) => r.response.status === 201).length, 1);
  assert.equal(distinct.filter((r) => r.response.status === 409).length, 7);
  for (let index = 0; index < 3; index++) {
    const value = await fixtures.quotedTask(tech),
      rejectInput = inputFor(value);
    const { reason, ...acceptInput } = rejectInput;
    const race = await Promise.all([
      decide("accept", reporter, value, acceptInput),
      decide("reject", reporter, value, rejectInput),
    ]);
    assert.deepEqual(race.map((r) => r.response.status).sort(), [201, 409]);
    const row = await state(value);
    assert.equal(row.version, 4);
    assert.equal(row.status, "processing");
    assert.equal(row.orders + row.rejections, 1);
    assert.equal(row.quoteStatus, row.orders ? "accepted" : "rejected");
    if (row.orders)
      check(
        await decide("reject", reporter, value, {
          ...rejectInput,
          expectedVersion: 4,
        }),
        409,
      );
  }
  const rollback = await fixtures.quotedTask(tech),
    rollbackInput = inputFor(rollback);
  assert.match(rollback.quote.id, /^[a-f0-9-]{36}$/);
  await db.query(
    `ALTER TABLE "QuoteRejection" ADD CONSTRAINT "${constraint}" CHECK ("quoteId" <> '${rollback.quote.id}')`,
  );
  constraintAdded = true;
  check(await decide("reject", reporter, rollback, rollbackInput), 500);
  assert.deepEqual(await state(rollback), {
    version: 3,
    status: "processing",
    quoteStatus: "pending",
    rejections: 0,
    orders: 0,
  });
  await db.query(
    `ALTER TABLE "QuoteRejection" DROP CONSTRAINT "${constraint}"`,
  );
  constraintAdded = false;
  check(await decide("reject", reporter, rollback, rollbackInput), 201);
  await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE "id"=$2', [
    "user-reporter-b",
    a.ticket.id,
  ]);
  try {
    check(await decide("reject", reporter, a, input), 404);
  } finally {
    await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE "id"=$2', [
      "user-reporter-a",
      a.ticket.id,
    ]);
  }
  console.log(
    "Quote rejection API: DTO/scope, normalized reason, immutable amount, audit projection, same/different-intent races, accept/reject competition, atomic rollback/retry and replay ownership passed.",
  );
} finally {
  if (constraintAdded)
    await db.query(
      `ALTER TABLE "QuoteRejection" DROP CONSTRAINT "${constraint}"`,
    );
  await fixtures.cleanup();
  await db.end();
}

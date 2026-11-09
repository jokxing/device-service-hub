import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "order.api");
let movedTicket;
let rollbackConstraint;
const check = (result, status) => {
  assert.equal(result.response.status, status, JSON.stringify(result.value));
  return result.value;
};
const accept = (cookie, id, body) =>
  local.request(`/tickets/${id}/quote/accept`, {
    cookie,
    method: "POST",
    body,
  });
const read = (cookie, id) =>
  local.request(`/orders/by-ticket/${id}`, { cookie });
const command = ({ ticket, quote }, patch = {}) => ({
  requestId: randomUUID(),
  expectedVersion: ticket.version,
  quoteId: quote.id,
  quoteRevision: quote.revision,
  ...patch,
});
async function audit(id) {
  return (
    await db.query(
      'SELECT t."status",t."version",q."status" AS "quoteStatus",(SELECT COUNT(*)::int FROM "ServiceOrder" WHERE "ticketId"=t."id") AS orders FROM "Ticket" t JOIN "TicketQuote" q ON q."ticketId"=t."id" WHERE t."id"=$1',
      [id],
    )
  ).rows[0];
}
try {
  await local.waitForApi();
  const tech = await fixtures.technician("订单验收维修员"),
    otherTech = await fixtures.technician("其他订单验收维修员");
  const { admin, reporter } = await fixtures.identities();
  const reporterB = await local.login("reporter.b");
  const a = await fixtures.quotedTask(tech),
    b = await fixtures.quotedTask(tech),
    c = await fixtures.quotedTask(tech);
  const input = command(a);
  for (const cookie of [undefined, admin, tech.cookie])
    check(await accept(cookie, a.ticket.id, input), cookie ? 403 : 401);
  check(await accept(reporterB, a.ticket.id, input), 404);
  check(await read(reporterB, a.ticket.id), 404);
  check(await read(otherTech.cookie, a.ticket.id), 404);
  check(await read(undefined, a.ticket.id), 401);
  assert.equal(check(await read(reporter, a.ticket.id), 200).order, null);
  check(await accept(reporter, "invalid", input), 400);
  check(await accept(reporter, randomUUID(), input), 404);
  for (const patch of [
    { requestId: "bad" },
    { quoteId: "bad" },
    { quoteRevision: 0 },
    { quoteRevision: "1" },
    { expectedVersion: -1 },
    { totalCents: 1 },
    { actorId: "user-admin" },
    { status: "accepted" },
    { items: [] },
  ])
    check(await accept(reporter, a.ticket.id, command(a, patch)), 400);
  for (const patch of [
    { expectedVersion: 2 },
    { quoteRevision: 2 },
    { quoteId: b.quote.id },
  ])
    check(await accept(reporter, a.ticket.id, command(a, patch)), 409);
  assert.deepEqual(await audit(a.ticket.id), {
    status: "processing",
    version: 3,
    quoteStatus: "pending",
    orders: 0,
  });
  const same = await Promise.all(
    Array.from({ length: 8 }, () => accept(reporter, a.ticket.id, input)),
  );
  const order = check(same[0], 201);
  for (const r of same) assert.deepEqual(check(r, 201), order);
  assert.equal(order.totalCents, 5998);
  assert.equal(order.quoteId, a.quote.id);
  assert.equal(order.quoteRevision, 1);
  assert.equal(order.status, "awaiting_start");
  assert.equal(order.confirmedBy.id, "user-reporter-a");
  assert.deepEqual(order.items, a.quote.items);
  assert.equal("requestId" in order, false);
  assert.equal("expectedVersion" in order, false);
  assert.deepEqual(await audit(a.ticket.id), {
    status: "processing",
    version: 4,
    quoteStatus: "accepted",
    orders: 1,
  });
  for (const cookie of [reporter, admin, tech.cookie])
    assert.deepEqual(check(await read(cookie, a.ticket.id), 200).order, order);
  assert.equal(
    check(
      await local.request(`/tickets/${a.ticket.id}/quote`, {
        cookie: reporter,
      }),
      200,
    ).quote.status,
    "accepted",
  );
  check(await accept(reporter, a.ticket.id, command(a)), 409);
  check(
    await accept(reporter, a.ticket.id, { ...input, quoteRevision: 2 }),
    409,
  );
  check(
    await accept(reporter, b.ticket.id, { ...input, quoteId: b.quote.id }),
    409,
  );
  const distinct = await Promise.all(
    Array.from({ length: 8 }, () => accept(reporter, b.ticket.id, command(b))),
  );
  assert.equal(distinct.filter((r) => r.response.status === 201).length, 1);
  assert.equal(distinct.filter((r) => r.response.status === 409).length, 7);
  // Force the final order write to fail, proving both earlier updates roll back.
  rollbackConstraint = "order_test_" + randomUUID().replaceAll("-", "");
  await db.query(
    `ALTER TABLE "ServiceOrder" ADD CONSTRAINT "${rollbackConstraint}" CHECK ("ticketId" <> '${c.ticket.id}')`,
  );
  const retryInput = command(c);
  check(await accept(reporter, c.ticket.id, retryInput), 500);
  assert.deepEqual(await audit(c.ticket.id), {
    status: "processing",
    version: 3,
    quoteStatus: "pending",
    orders: 0,
  });
  await db.query(
    `ALTER TABLE "ServiceOrder" DROP CONSTRAINT "${rollbackConstraint}"`,
  );
  rollbackConstraint = undefined;
  check(await accept(reporter, c.ticket.id, retryInput), 201);
  // Later source-row changes on this generated fixture cannot rewrite the order snapshot.
  await db.query(
    'UPDATE "QuoteItem" SET "name"=$1,"unitPriceCents"="unitPriceCents"+1,"amountCents"="amountCents"+"quantity" WHERE "quoteId"=$2 AND "position"=0',
    ["临时源报价变更", a.quote.id],
  );
  await db.query(
    'UPDATE "TicketQuote" SET "totalCents"="totalCents"+3 WHERE "id"=$1',
    [a.quote.id],
  );
  assert.deepEqual(check(await read(reporter, a.ticket.id), 200).order, order);
  assert.deepEqual(
    check(await accept(reporter, a.ticket.id, input), 201),
    order,
  );
  check(
    await local.request(`/tasks/${a.ticket.id}/result`, {
      cookie: tech.cookie,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 4,
        description: "不能绕过订单开工",
      },
    }),
    409,
  );
  movedTicket = a.ticket.id;
  await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE "id"=$2', [
    "user-reporter-b",
    movedTicket,
  ]);
  check(await accept(reporter, a.ticket.id, input), 404);
  check(await read(reporter, a.ticket.id), 404);
  await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE "id"=$2', [
    "user-reporter-a",
    movedTicket,
  ]);
  movedTicket = undefined;
  console.log(
    "Order API: owner-only exact-version confirmation, immutable snapshots, same/distinct intent concurrency, transactional rollback, scoped reads and result gate passed.",
  );
} finally {
  if (rollbackConstraint)
    await db.query(
      `ALTER TABLE "ServiceOrder" DROP CONSTRAINT IF EXISTS "${rollbackConstraint}"`,
    );
  if (movedTicket)
    await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE "id"=$2', [
      "user-reporter-a",
      movedTicket,
    ]);
  await fixtures.cleanup();
  await db.end();
}

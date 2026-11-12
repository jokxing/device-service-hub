import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "nq.revise"),
  tokens = [];
const ck = (r, n) => {
  assert.equal(r.status, n, JSON.stringify(r.value));
  return r.value;
};
async function login(username) {
  const r = await nativeRequest("/mobile/auth/login", {
    method: "POST",
    body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
  });
  tokens.push(ck(r, 200).accessToken);
  return r.value.accessToken;
}
try {
  await local.waitForApi();
  const tech = await f.technician("原生修订维修员"),
    a = await login("reporter.a"),
    b = await login("reporter.b"),
    t = await login(tech.id),
    other = await f.technician("其他维修员"),
    t2 = await login(other.id),
    v = await f.quotedTask(tech);
  const route = "/mobile/tasks/" + v.ticket.id + "/quote/revisions";
  const body = {
    requestId: randomUUID(),
    expectedVersion: v.ticket.version + 1,
    baseQuoteId: v.quote.id,
    baseQuoteRevision: 1,
    items: [
      { name: "替换配件", quantity: 2, unitPriceCents: 1234, note: "修订" },
    ],
  };
  const revise = (token, input = body, headers) =>
    nativeRequest(route, { token, method: "POST", body: input, headers });
  ck(await revise(), 401);
  ck(await revise(a), 403);
  ck(await revise(t2), 404);
  ck(await revise(t), 409);
  ck(
    await nativeRequest("/mobile/tickets/" + v.ticket.id + "/quote/reject", {
      token: a,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: v.ticket.version,
        quoteId: v.quote.id,
        quoteRevision: 1,
        reason: "预算不足",
      },
    }),
    201,
  );
  ck(await revise(t, { ...body, baseQuoteRevision: 2 }), 409);
  ck(await revise(t, body, { Origin: "http://127.0.0.1:5173" }), 403);
  const revisions = await Promise.all(
    Array.from({ length: 5 }, () => revise(t)),
  );
  revisions.forEach((r) => ck(r, 201));
  const quote = revisions[0].value;
  assert.equal(quote.revision, 2);
  assert.equal(quote.totalCents, 2468);
  assert(revisions.every((r) => r.value.id === quote.id));
  ck(
    await revise(t, { ...body, items: [{ ...body.items[0], quantity: 3 }] }),
    409,
  );
  const old = (
    await db.query(
      'SELECT status,"totalCents" FROM "TicketQuote" WHERE id=$1',
      [v.quote.id],
    )
  ).rows[0];
  assert.equal(old.status, "rejected");
  assert.equal(old.totalCents, v.quote.totalCents);
  const order = ck(
    await nativeRequest("/mobile/tickets/" + v.ticket.id + "/quote/accept", {
      token: a,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: v.ticket.version + 2,
        quoteId: quote.id,
        quoteRevision: 2,
      },
    }),
    201,
  );
  ck(await nativeRequest("/mobile/orders"), 401);
  ck(await nativeRequest("/mobile/orders", { token: t }), 403);
  ck(await nativeRequest("/mobile/orders/" + order.id, { token: b }), 404);
  ck(await nativeRequest("/mobile/orders?page=0", { token: a }), 400);
  const detail = ck(
    await nativeRequest("/mobile/orders/" + order.id, { token: a }),
    200,
  );
  assert.equal(detail.totalCents, 2468);
  assert.equal(detail.quoteRevision, 2);
  const list = ck(
    await nativeRequest("/mobile/orders?status=awaiting_start&pageSize=50", {
      token: a,
    }),
    200,
  );
  assert(list.items.some((row) => row.id === order.id));
  const hidden = ck(
    await nativeRequest("/mobile/orders?pageSize=50", { token: b }),
    200,
  );
  assert(!hidden.items.some((row) => row.id === order.id));
  const first = ck(
      await nativeRequest("/mobile/orders?pageSize=1", { token: a }),
      200,
    ),
    second = ck(
      await nativeRequest("/mobile/orders?pageSize=1&page=2", { token: a }),
      200,
    );
  assert.equal(first.items[0].id, order.id);
  assert(second.items.every((row) => row.id !== order.id));
  ck(await nativeRequest("/mobile/orders?status=invalid", { token: a }), 400);
  console.log(
    "Native revision immutable history/exact replay and order list/detail scope passed.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await f.cleanup();
  await db.end();
}

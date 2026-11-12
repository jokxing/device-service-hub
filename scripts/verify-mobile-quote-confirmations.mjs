import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "nq.accept"),
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
  const tech = await f.technician("RN报价确认维修员"),
    v = await f.quotedTask(tech),
    a = await login("reporter.a"),
    b = await login("reporter.b"),
    t = await login(tech.id),
    admin = await login("admin");
  const quote = `/mobile/tickets/${v.ticket.id}/quote`,
    order = `/mobile/orders/by-ticket/${v.ticket.id}`,
    route = quote + "/accept";
  const input = {
    requestId: randomUUID(),
    expectedVersion: v.ticket.version,
    quoteId: v.quote.id,
    quoteRevision: v.quote.revision,
  };
  const accept = (token, body = input, headers) =>
    nativeRequest(route, { token, method: "POST", body, headers });
  ck(await nativeRequest(quote), 401);
  for (const token of [admin, t]) {
    ck(await nativeRequest(quote, { token }), 403);
    ck(await nativeRequest(order, { token }), 403);
    ck(await accept(token), 403);
  }
  ck(await nativeRequest(quote, { token: b }), 404);
  ck(await nativeRequest(order, { token: b }), 404);
  ck(await accept(b), 404);
  assert.equal(
    ck(await nativeRequest(quote, { token: a }), 200).quote.id,
    v.quote.id,
  );
  assert.equal(ck(await nativeRequest(order, { token: a }), 200).order, null);
  ck(await accept(a, input, { Origin: "http://127.0.0.1:5173" }), 403);
  ck(await accept(a, { ...input, totalCents: 1 }), 400);
  ck(await accept(a, { ...input, expectedVersion: 0 }), 409);
  ck(await accept(a, { ...input, quoteRevision: 2 }), 409);
  const rows = await Promise.all(Array.from({ length: 8 }, () => accept(a)));
  rows.forEach((r) => ck(r, 201));
  assert.equal(new Set(rows.map((r) => r.value.id)).size, 1);
  assert.equal(rows[0].value.totalCents, v.quote.totalCents);
  assert.deepEqual(rows[0].value.items, v.quote.items);
  assert.equal(
    ck(await nativeRequest(order, { token: a }), 200).order.id,
    rows[0].value.id,
  );
  ck(await accept(a, { ...input, requestId: randomUUID() }), 409);
  await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
    "user-reporter-b",
    v.ticket.id,
  ]);
  try {
    ck(await accept(a), 404);
    ck(await nativeRequest(order, { token: a }), 404);
  } finally {
    await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
      "user-reporter-a",
      v.ticket.id,
    ]);
  }
  console.log(
    "RN quote acceptance: reporter/current owner, native/browser boundary, version/revision, server snapshot, exact intent concurrency and current owner replay passed.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await f.cleanup();
  await db.end();
}

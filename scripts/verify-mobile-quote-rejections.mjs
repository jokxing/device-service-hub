import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "nq.reject"),
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
  const tech = await f.technician("原生拒绝报价维修员"),
    a = await login("reporter.a"),
    b = await login("reporter.b"),
    t = await login(tech.id),
    v = await f.quotedTask(tech);
  const input = {
      requestId: randomUUID(),
      expectedVersion: v.ticket.version,
      quoteId: v.quote.id,
      quoteRevision: 1,
      reason: "  预算超出范围  ",
    },
    route = `/mobile/tickets/${v.ticket.id}/quote/reject`;
  const reject = (token, body = input, headers) =>
    nativeRequest(route, { token, method: "POST", body, headers });
  ck(await reject(), 401);
  ck(await reject(t), 403);
  ck(await reject(b), 404);
  ck(await reject(a, { ...input, reason: " " }), 400);
  ck(await reject(a, { ...input, reason: "x".repeat(501) }), 400);
  ck(await reject(a, { ...input, expectedVersion: 0 }), 409);
  ck(await reject(a, input, { Origin: "http://127.0.0.1:5173" }), 403);
  const rr = await Promise.all(Array.from({ length: 6 }, () => reject(a)));
  rr.forEach((r) => ck(r, 201));
  assert.equal(rr[0].value.rejection.reason, "预算超出范围");
  ck(await reject(a, { ...input, reason: "换原因" }), 409);
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "ServiceOrder" WHERE "ticketId"=$1',
        [v.ticket.id],
      )
    ).rows[0].n,
    0,
  );
  console.log(
    "RN quote rejection permissions, validation, normalized reason, exact replay and no order passed.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await f.cleanup();
  await db.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase();
const f = quoteFixtures(local, db, "n.alipay.refund"),
  tokens = [];
const check = (r, status) => {
  assert.equal(
    r.status,
    status,
    `Unexpected HTTP ${r.status}: ${JSON.stringify(r.value)}`,
  );
  return r.value;
};
async function login(username) {
  const value = check(
    await nativeRequest("/mobile/auth/login", {
      method: "POST",
      body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
    }),
    200,
  );
  tokens.push(value.accessToken);
  return value.accessToken;
}
try {
  await local.waitForApi();
  const tech = await f.technician("原生渠道退款验证");
  const owner = await login("reporter.a"),
    foreign = await login("reporter.b"),
    technician = await login(tech.id),
    admin = await login("admin");
  async function paid(success = true) {
    const v = await f.orderedTask(tech);
    const p = check(
      await nativeRequest(`/mobile/orders/${v.order.id}/alipay-sandbox`, {
        token: owner,
        method: "POST",
        body: { requestId: randomUUID() },
      }),
      201,
    ).payment;
    // Dedicated local fixture only; not an actual channel payment or buyer-payment evidence.
    if (success)
      await db.query(
        'UPDATE "AlipaySandboxPayment" SET status=\'succeeded\',"tradeNo"=$1 WHERE id=$2 AND "orderId"=$3',
        [
          "2026" +
            Date.now() +
            String(Math.floor(Math.random() * 100000)).padStart(5, "0"),
          p.id,
          v.order.id,
        ],
      );
    return { ...v, p };
  }
  const v = await paid();
  const route = `/mobile/orders/${v.order.id}/alipay-sandbox/${v.p.id}/refund`;
  const input = { requestId: randomUUID(), reason: "  Plan changed  " };
  const request = (token = owner, body = input, headers) =>
    nativeRequest(route, { token, method: "POST", body, headers });
  check(await nativeRequest(route, { method: "POST", body: input }), 401);
  for (const token of [admin, technician]) check(await request(token), 403);
  check(await request(foreign), 404);
  for (const headers of [
    { Origin: "http://127.0.0.1:5173" },
    { Cookie: "fake=x" },
    { "Sec-Fetch-Mode": "cors" },
  ])
    check(await request(owner, input, headers), 403);
  for (const body of [
    {},
    { ...input, requestId: "bad" },
    { ...input, reason: " " },
    { ...input, reason: "x".repeat(501) },
    { ...input, amountCents: 1 },
    { ...input, actorId: "fake" },
  ])
    check(await request(owner, body), 400);
  const results = await Promise.all(Array.from({ length: 5 }, () => request()));
  const first = check(results[0], 201);
  results.forEach((r) =>
    assert.equal(check(r, 201).refund.id, first.refund.id),
  );
  assert.equal(first.status, "succeeded");
  assert.equal(first.refund.status, "requested");
  assert.equal(first.refund.reason, "Plan changed");
  assert.equal(first.refund.amountCents, v.order.totalCents);
  check(await request(owner, { ...input, requestId: randomUUID() }), 409);
  check(await request(owner, { ...input, reason: "Other reason" }), 409);
  const read = check(
    await nativeRequest(route + "/query", { token: owner, method: "POST" }),
    201,
  );
  assert.equal(read.refund.id, first.refund.id);
  assert.equal(read.refund.status, "requested");
  for (const token of [admin, technician])
    check(
      await nativeRequest(route + "/query", { token, method: "POST" }),
      403,
    );
  check(
    await nativeRequest(route + "/query", { token: foreign, method: "POST" }),
    404,
  );
  check(
    await nativeRequest(route + "/submit", { token: owner, method: "POST" }),
    404,
  );
  const ticket = (
    await db.query('SELECT version FROM "Ticket" WHERE id=$1', [v.ticket.id])
  ).rows[0];
  check(
    await nativeRequest(`/mobile/orders/${v.order.id}/start`, {
      token: technician,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: ticket.version },
    }),
    409,
  );
  const unpaid = await paid(false);
  check(
    await nativeRequest(
      `/mobile/orders/${unpaid.order.id}/alipay-sandbox/${unpaid.p.id}/refund`,
      {
        token: owner,
        method: "POST",
        body: { requestId: randomUUID(), reason: "Not paid" },
      },
    ),
    409,
  );
  const started = await paid();
  check(
    await nativeRequest(`/mobile/orders/${started.order.id}/start`, {
      token: technician,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: started.ticket.version,
      },
    }),
    201,
  );
  check(
    await nativeRequest(
      `/mobile/orders/${started.order.id}/alipay-sandbox/${started.p.id}/refund`,
      {
        token: owner,
        method: "POST",
        body: { requestId: randomUUID(), reason: "Already started" },
      },
    ),
    409,
  );
  console.log(
    "Passed: native refund owner/roles/browser boundary, DTO/full amount, normalized concurrent replay, requested readback, no native submit, unstarted gate and start suspension. Paid fixtures were local injections, not actual channel payments/refunds.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { token, method: "POST" }).catch(
      () => {},
    );
  await f.cleanup();
  await local.dispose();
  await db.end();
}

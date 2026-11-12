import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "n.pay"),
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
const expire = (p) =>
  db.query(
    `UPDATE "PaymentAttempt" SET "expiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-interval '1 second' WHERE id=$1`,
    [p.id],
  );
try {
  await local.waitForApi();
  const tech = await f.technician("原生模拟支付维修员"),
    a = await login("reporter.a"),
    b = await login("reporter.b"),
    t = await login(tech.id),
    admin = await login("admin"),
    v = await f.orderedTask(tech),
    w = await f.orderedTask(tech);
  const route = "/mobile/orders/" + v.order.id + "/payments",
    input = { requestId: randomUUID() },
    create = (token, body = input, headers) =>
      nativeRequest(route, { token, method: "POST", body, headers });
  ck(await create(), 401);
  for (const token of [t, admin]) ck(await create(token), 403);
  ck(await create(b), 404);
  for (const patch of [
    { amountCents: 1 },
    { channel: "alipay" },
    { requestId: "bad" },
  ])
    ck(await create(a, { ...input, ...patch }), 400);
  ck(await create(a, input, { Origin: "http://127.0.0.1:5173" }), 403);
  ck(
    await nativeRequest(route, { token: a, headers: { Cookie: "fake=x" } }),
    403,
  );
  const created = await Promise.all(Array.from({ length: 6 }, () => create(a)));
  created.forEach((r) => ck(r, 201));
  const p = created[0].value;
  assert(created.every((r) => r.value.id === p.id));
  assert.equal(p.amountCents, v.order.totalCents);
  assert.equal(p.channel, "mock");
  assert.equal(Date.parse(p.expiresAt) - Date.parse(p.createdAt), 900000);
  ck(await create(a, { requestId: randomUUID() }), 409);
  ck(
    await nativeRequest("/mobile/orders/" + w.order.id + "/payments", {
      token: a,
      method: "POST",
      body: input,
    }),
    409,
  );
  for (const token of [t, admin])
    ck(await nativeRequest(route, { token }), 403);
  ck(await nativeRequest(route, { token: b }), 404);
  const success = () =>
    nativeRequest(route + "/" + p.id + "/mock-success", {
      token: a,
      method: "POST",
      body: { amountCents: 1, currency: "USD" },
    });
  ck(
    await nativeRequest(route + "/" + p.id + "/mock-success", {
      token: b,
      method: "POST",
    }),
    404,
  );
  ck(
    await nativeRequest(route + "/" + p.id + "/mock-success", {
      token: t,
      method: "POST",
    }),
    403,
  );
  const confirmed = await Promise.all(Array.from({ length: 6 }, success));
  confirmed.forEach((r) => ck(r, 201));
  assert(
    confirmed.every(
      (r) =>
        r.value.status === "succeeded" &&
        r.value.amountCents === v.order.totalCents &&
        r.value.currency === "CNY",
    ),
  );
  assert.equal(new Set(confirmed.map((r) => r.value.succeededAt)).size, 1);
  ck(
    await nativeRequest("/mobile/orders/" + v.order.id + "/cancel", {
      token: a,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: v.ticket.version,
        reason: "模拟成功后取消",
      },
    }),
    409,
  );
  const order = ck(
    await nativeRequest("/mobile/orders/" + v.order.id, { token: a }),
    200,
  );
  assert.equal(order.status, "awaiting_start");
  assert.equal(order.totalCents, v.order.totalCents);
  const secondRoute = "/mobile/orders/" + w.order.id + "/payments",
    secondInput = { requestId: randomUUID() },
    q = ck(
      await nativeRequest(secondRoute, {
        token: a,
        method: "POST",
        body: secondInput,
      }),
      201,
    );
  await expire(q);
  ck(
    await nativeRequest(secondRoute + "/" + q.id + "/mock-success", {
      token: a,
      method: "POST",
    }),
    409,
  );
  assert.equal(
    (await db.query('SELECT status FROM "PaymentAttempt" WHERE id=$1', [q.id]))
      .rows[0].status,
    "closed",
  );
  const old = ck(
    await nativeRequest(secondRoute, {
      token: a,
      method: "POST",
      body: secondInput,
    }),
    201,
  );
  assert.equal(old.id, q.id);
  assert.equal(old.closeReason, "expired");
  const fresh = ck(
    await nativeRequest(secondRoute, {
      token: a,
      method: "POST",
      body: { requestId: randomUUID() },
    }),
    201,
  );
  assert.notEqual(fresh.id, q.id);
  await expire(fresh);
  const closed = ck(
    await nativeRequest(secondRoute, { token: a }),
    200,
  ).payments;
  assert(closed.every((row) => row.status === "closed"));
  const race = await f.orderedTask(tech),
    raceRoute = "/mobile/orders/" + race.order.id + "/payments",
    rp = ck(
      await nativeRequest(raceRoute, {
        token: a,
        method: "POST",
        body: { requestId: randomUUID() },
      }),
      201,
    ),
    rr = await Promise.all([
      nativeRequest(raceRoute + "/" + rp.id + "/mock-success", {
        token: a,
        method: "POST",
      }),
      nativeRequest("/mobile/orders/" + race.order.id + "/cancel", {
        token: a,
        method: "POST",
        body: {
          requestId: randomUUID(),
          expectedVersion: race.ticket.version,
          reason: "竞争取消",
        },
      }),
    ]);
  assert.deepEqual(rr.map((r) => r.status).sort(), [201, 409]);
  console.log(
    "Native mock payment scope/DTO/amount, same-intent create, idempotent success, cancellation race, DB-clock expiry and new-intent recreation passed. No real payment.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await f.cleanup();
  await db.end();
}

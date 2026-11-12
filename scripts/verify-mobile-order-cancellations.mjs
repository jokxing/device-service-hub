import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "n.cancel"),
  tokens = [];
const ck = (r, n) => {
  assert.equal(r.status, n, JSON.stringify(r.value));
  return r.value;
};
const web = (r, n) => {
  assert.equal(r.response.status, n, JSON.stringify(r.value));
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
  const tech = await f.technician("原生取消维修员"),
    a = await login("reporter.a"),
    b = await login("reporter.b"),
    t = await login(tech.id),
    { reporter } = await f.identities(),
    v = await f.orderedTask(tech);
  const input = {
      requestId: randomUUID(),
      expectedVersion: v.ticket.version,
      reason: "  需求变更  ",
    },
    route = "/mobile/orders/" + v.order.id + "/cancel",
    cancel = (token, body = input, headers) =>
      nativeRequest(route, { token, method: "POST", body, headers });
  ck(await cancel(), 401);
  ck(await cancel(t), 403);
  ck(await cancel(b), 404);
  for (const patch of [
    { reason: " " },
    { reason: "x".repeat(501) },
    { expectedVersion: "4" },
    { totalCents: 1 },
  ])
    ck(await cancel(a, { ...input, ...patch }), 400);
  ck(await cancel(a, { ...input, expectedVersion: 0 }), 409);
  ck(await cancel(a, input, { Origin: "http://127.0.0.1:5173" }), 403);
  const payment = web(
    await local.request("/orders/" + v.order.id + "/payments", {
      cookie: reporter,
      method: "POST",
      body: { requestId: randomUUID() },
    }),
    201,
  );
  const rows = await Promise.all(Array.from({ length: 6 }, () => cancel(a)));
  rows.forEach((r) => ck(r, 201));
  assert.equal(rows[0].value.cancellation.reason, "需求变更");
  ck(await cancel(a, { ...input, reason: "其他原因" }), 409);
  const detail = ck(
    await nativeRequest("/mobile/orders/" + v.order.id, { token: a }),
    200,
  );
  assert.equal(detail.status, "cancelled");
  assert.equal(detail.ticket.status, "cancelled");
  assert.equal(detail.totalCents, v.order.totalCents);
  assert.deepEqual(detail.items, v.order.items);
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "ServiceOrderCancellation" WHERE "orderId"=$1',
        [v.order.id],
      )
    ).rows[0].n,
    1,
  );
  assert.equal(
    (
      await db.query('SELECT status FROM "PaymentAttempt" WHERE id=$1', [
        payment.id,
      ])
    ).rows[0].status,
    "closed",
  );
  const paid = await f.orderedTask(tech),
    p = web(
      await local.request("/orders/" + paid.order.id + "/payments", {
        cookie: reporter,
        method: "POST",
        body: { requestId: randomUUID() },
      }),
      201,
    );
  web(
    await local.request(
      "/orders/" + paid.order.id + "/payments/" + p.id + "/mock-success",
      { cookie: reporter, method: "POST", body: {} },
    ),
    201,
  );
  const denied = await nativeRequest(
    "/mobile/orders/" + paid.order.id + "/cancel",
    {
      token: a,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: paid.ticket.version,
        reason: "已模拟成功",
      },
    },
  );
  ck(denied, 409);
  assert(denied.value.message.includes("不能取消"));
  const state = (
    await db.query('SELECT status,version FROM "Ticket" WHERE id=$1', [
      paid.ticket.id,
    ])
  ).rows[0];
  assert.equal(state.status, "processing");
  assert.equal(state.version, paid.ticket.version);
  const race = await f.orderedTask(tech),
    rr = await Promise.all([
      nativeRequest("/mobile/orders/" + race.order.id + "/cancel", {
        token: a,
        method: "POST",
        body: {
          requestId: randomUUID(),
          expectedVersion: race.ticket.version,
          reason: "取消竞争",
        },
      }),
      nativeRequest("/mobile/orders/" + race.order.id + "/start", {
        token: t,
        method: "POST",
        body: { requestId: randomUUID(), expectedVersion: race.ticket.version },
      }),
    ]);
  assert.deepEqual(rr.map((r) => r.status).sort(), [201, 409]);
  console.log(
    "RN order cancellation role/owner/DTO/version/native boundary, exact replay, immutable snapshot, pending close, paid rollback and start race passed.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await f.cleanup();
  await db.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "n.refund"),
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
  const tech = await f.technician("原生退款维修员"),
    a = await login("reporter.a"),
    b = await login("reporter.b"),
    t = await login(tech.id),
    adminToken = await login("admin"),
    { admin } = await f.identities();
  async function paid() {
    const v = await f.orderedTask(tech),
      p = ck(
        await nativeRequest("/mobile/orders/" + v.order.id + "/payments", {
          token: a,
          method: "POST",
          body: { requestId: randomUUID() },
        }),
        201,
      );
    ck(
      await nativeRequest(
        "/mobile/orders/" + v.order.id + "/payments/" + p.id + "/mock-success",
        { token: a, method: "POST" },
      ),
      201,
    );
    return { ...v, p };
  }
  const v = await paid(),
    route = "/mobile/orders/" + v.order.id + "/payments/" + v.p.id + "/refund",
    input = { requestId: randomUUID(), reason: "  尚未开工，计划变更  " },
    refund = (token, body = input, headers) =>
      nativeRequest(route, { token, method: "POST", body, headers });
  ck(await refund(), 401);
  for (const token of [t, adminToken]) ck(await refund(token), 403);
  ck(await refund(b), 404);
  for (const patch of [
    { reason: " " },
    { reason: "x".repeat(501) },
    { amountCents: 1 },
    { requestId: "bad" },
  ])
    ck(await refund(a, { ...input, ...patch }), 400);
  ck(await refund(a, input, { Origin: "http://127.0.0.1:5173" }), 403);
  ck(await refund(a, input, { Cookie: "fake=x" }), 403);
  const rows = await Promise.all(Array.from({ length: 6 }, () => refund(a)));
  rows.forEach((r) => ck(r, 201));
  assert.equal(new Set(rows.map((r) => r.value.refund.id)).size, 1);
  assert.equal(rows[0].value.refund.status, "requested");
  assert.equal(rows[0].value.refund.reason, "尚未开工，计划变更");
  assert.equal(rows[0].value.refund.amountCents, v.order.totalCents);
  assert.equal(rows[0].value.status, "succeeded");
  assert.equal(rows[0].value.refund.completion, null);
  ck(await refund(a, { ...input, reason: "不同原因" }), 409);
  ck(await refund(a, { ...input, requestId: randomUUID() }), 409);
  const version = (
    await db.query('SELECT version FROM "Ticket" WHERE id=$1', [v.ticket.id])
  ).rows[0].version;
  assert.equal(version, v.ticket.version + 1);
  ck(
    await nativeRequest("/mobile/orders/" + v.order.id + "/start", {
      token: t,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: version },
    }),
    409,
  );
  ck(
    await nativeRequest(route + "/mock-success", {
      token: adminToken,
      method: "POST",
      body: { requestId: randomUUID() },
    }),
    404,
  );
  const complete = await local.request(
    "/orders/" + v.order.id + "/payments/" + v.p.id + "/refund/mock-success",
    { cookie: admin, method: "POST", body: { requestId: randomUUID() } },
  );
  assert.equal(complete.response.status, 201, JSON.stringify(complete.value));
  const read = ck(
    await nativeRequest("/mobile/orders/" + v.order.id + "/payments", {
      token: a,
    }),
    200,
  ).payments[0];
  assert.equal(read.refund.status, "succeeded");
  assert(read.refund.completion.actor.name);
  assert.equal(read.status, "succeeded");
  const detail = ck(
    await nativeRequest("/mobile/orders/" + v.order.id, { token: a }),
    200,
  );
  assert.equal(detail.status, "cancelled");
  assert.equal(detail.ticket.status, "cancelled");
  assert.deepEqual(detail.items, v.order.items);
  ck(await refund(a), 201);
  const begun = await paid();
  ck(
    await nativeRequest("/mobile/orders/" + begun.order.id + "/start", {
      token: t,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: begun.ticket.version },
    }),
    201,
  );
  ck(
    await nativeRequest(
      "/mobile/orders/" +
        begun.order.id +
        "/payments/" +
        begun.p.id +
        "/refund",
      {
        token: a,
        method: "POST",
        body: { requestId: randomUUID(), reason: "已开工" },
      },
    ),
    409,
  );
  const race = await paid(),
    rr = await Promise.all([
      nativeRequest(
        "/mobile/orders/" +
          race.order.id +
          "/payments/" +
          race.p.id +
          "/refund",
        {
          token: a,
          method: "POST",
          body: { requestId: randomUUID(), reason: "竞争退款" },
        },
      ),
      nativeRequest("/mobile/orders/" + race.order.id + "/start", {
        token: t,
        method: "POST",
        body: { requestId: randomUUID(), expectedVersion: race.ticket.version },
      }),
    ]);
  assert.deepEqual(rr.map((r) => r.status).sort(), [201, 409]);
  console.log(
    "Native mock refund role/owner/DTO, normalized exact replay, server full amount, requested-only state, start exclusion/race and Web-admin result reread passed. No native processing or real refund.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await f.cleanup();
  await db.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = quoteFixtures(local, db, "n.order.flow"),
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
  const tech = await f.technician("原生履约维修员"),
    other = await f.technician("其他履约维修员"),
    t = await login(tech.id),
    o = await login(other.id),
    a = await login("reporter.a"),
    b = await login("reporter.b"),
    v = await f.orderedTask(tech);
  const route = "/mobile/orders/" + v.order.id + "/start",
    input = { requestId: randomUUID(), expectedVersion: v.ticket.version },
    start = (token, body = input, headers) =>
      nativeRequest(route, { token, method: "POST", body, headers });
  ck(await start(), 401);
  ck(await start(a), 403);
  ck(await start(o), 404);
  ck(await start(t, { ...input, totalCents: 1 }), 400);
  ck(await start(t, { ...input, expectedVersion: 0 }), 409);
  ck(await start(t, input, { Origin: "http://127.0.0.1:5173" }), 403);
  ck(
    await nativeRequest("/mobile/tasks/" + v.ticket.id + "/order", {
      token: o,
    }),
    404,
  );
  ck(
    await nativeRequest("/mobile/tasks/" + v.ticket.id + "/order", {
      token: a,
    }),
    403,
  );
  const resultRoute = "/mobile/tasks/" + v.ticket.id + "/result";
  ck(
    await nativeRequest(resultRoute, {
      token: t,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: v.ticket.version,
        description: "尚未开工",
      },
    }),
    409,
  );
  const starts = await Promise.all(Array.from({ length: 6 }, () => start(t)));
  starts.forEach((r) => ck(r, 201));
  assert(starts.every((r) => r.value.status === "in_progress"));
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int n FROM "ServiceOrderStart" WHERE "orderId"=$1',
        [v.order.id],
      )
    ).rows[0].n,
    1,
  );
  const result = {
    requestId: randomUUID(),
    expectedVersion: v.ticket.version + 1,
    description: "已更换接线端子并复检",
  };
  ck(
    await nativeRequest(resultRoute, {
      token: t,
      method: "POST",
      body: result,
    }),
    201,
  );
  const waiting = ck(
    await nativeRequest("/mobile/tasks/" + v.ticket.id + "/order", {
      token: t,
    }),
    200,
  ).order;
  assert.equal(waiting.status, "awaiting_confirmation");
  ck(
    await nativeRequest("/mobile/tickets/" + v.ticket.id + "/confirm", {
      token: b,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: v.ticket.version + 2 },
    }),
    404,
  );
  ck(
    await nativeRequest("/mobile/tickets/" + v.ticket.id + "/confirm", {
      token: a,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: v.ticket.version + 2 },
    }),
    201,
  );
  const done = ck(
    await nativeRequest("/mobile/orders/" + v.order.id, { token: a }),
    200,
  );
  assert.equal(done.status, "completed");
  assert.equal(done.ticket.status, "completed");
  assert.equal(done.totalCents, v.order.totalCents);
  const race = await f.orderedTask(tech),
    { reporter } = await f.identities();
  const rr = await Promise.all([
    nativeRequest("/mobile/orders/" + race.order.id + "/start", {
      token: t,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: race.ticket.version },
    }),
    local.request("/orders/" + race.order.id + "/cancel", {
      cookie: reporter,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: race.ticket.version,
        reason: "需求变更",
      },
    }),
  ]);
  assert.deepEqual([rr[0].status, rr[1].response.status].sort(), [201, 409]);
  console.log(
    "RN start permissions/DTO/replay/cancel race, result gate and atomic order/ticket completion passed.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await f.cleanup();
  await db.end();
}

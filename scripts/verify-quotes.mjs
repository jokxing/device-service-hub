import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
import { nativeRequest } from "./lib/native-api.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "quote.api");
let nativeToken;
const check = (result, status) => {
  assert.equal(result.response.status, status, JSON.stringify(result.value));
  return result.value;
};
const command = (patch = {}) => ({
  requestId: randomUUID(),
  expectedVersion: 2,
  items: [
    {
      name: "  更换接线端子  ",
      quantity: 3,
      unitPriceCents: 1999,
      note: "  含安装  ",
    },
    { name: "检测", quantity: 1, unitPriceCents: 1, note: "" },
  ],
  ...patch,
});
const submit = (cookie, id, body = command()) =>
  local.request(`/tickets/${id}/quote`, { cookie, method: "POST", body });
const read = async (cookie, id) => {
  const result = await local.request(`/tickets/${id}/quote`, { cookie });
  return result.response.status === 200
    ? { ...result, value: result.value.quote }
    : result;
};
try {
  await local.waitForApi();
  const a = await fixtures.technician("报价验收维修员甲"),
    b = await fixtures.technician("报价验收维修员乙");
  const { admin, reporter } = await fixtures.identities();
  const task = await fixtures.task(a, { serviceMode: "quoted" });
  const other = await fixtures.task(b, { serviceMode: "quoted" });
  const direct = await fixtures.task(a);
  const assigned = await fixtures.task(a, {
    stage: "assigned",
    serviceMode: "quoted",
  });
  const another = await fixtures.task(a, { serviceMode: "quoted" });
  assert.equal(task.serviceMode, "quoted");
  assert.equal(direct.serviceMode, "direct");
  assert.equal(check(await read(a.cookie, task.id), 200), null);
  for (const cookie of [undefined, admin, reporter])
    check(await submit(cookie, task.id), cookie ? 403 : 401);
  assert.equal(check(await read(reporter, task.id), 200), null);
  const reporterB = await local.login("reporter.b");
  check(await read(reporterB, task.id), 404);
  for (const id of [other.id, randomUUID()]) {
    check(await read(a.cookie, id), 404);
    check(await submit(a.cookie, id), 404);
  }
  check(await submit(a.cookie, "invalid"), 400);
  check(await submit(a.cookie, direct.id), 409);
  check(
    await submit(a.cookie, assigned.id, command({ expectedVersion: 1 })),
    409,
  );
  for (const patch of [
    { requestId: "invalid" },
    { expectedVersion: 1.5 },
    { totalCents: 1 },
    { actorId: a.id },
    { status: "pending" },
    { items: [] },
    { items: null },
    { items: Array.from({ length: 21 }, () => command().items[0]) },
  ])
    check(await submit(a.cookie, task.id, command(patch)), 400);
  for (const patch of [
    { name: " " },
    { name: "x".repeat(61) },
    { quantity: 0 },
    { quantity: 1.1 },
    { quantity: "2" },
    { quantity: 1000 },
    { unitPriceCents: -1 },
    { unitPriceCents: 1.1 },
    { unitPriceCents: 10000001 },
    { note: null },
    { note: "x".repeat(201) },
    { amountCents: 1 },
  ])
    check(
      await submit(
        a.cookie,
        task.id,
        command({ items: [{ ...command().items[0], ...patch }] }),
      ),
      400,
    );
  check(
    await submit(
      a.cookie,
      task.id,
      command({
        items: [
          { ...command().items[0], quantity: 11, unitPriceCents: 10000000 },
        ],
      }),
    ),
    400,
  );
  check(
    await submit(
      a.cookie,
      task.id,
      command({ items: [{ ...command().items[0], unitPriceCents: 0 }] }),
    ),
    400,
  );
  check(await submit(a.cookie, task.id, command({ expectedVersion: 1 })), 409);
  const blocked = {
    requestId: randomUUID(),
    expectedVersion: 2,
    description: "不得绕过报价",
  };
  check(
    await local.request(`/tasks/${task.id}/result`, {
      cookie: a.cookie,
      method: "POST",
      body: blocked,
    }),
    409,
  );
  const login = await nativeRequest("/mobile/auth/login", {
    method: "POST",
    body: { username: a.id, password: process.env.SEED_ACCOUNT_PASSWORD },
  });
  assert.equal(login.status, 200);
  nativeToken = login.value.accessToken;
  assert.equal(
    (
      await nativeRequest(`/mobile/tasks/${task.id}/result`, {
        token: nativeToken,
        method: "POST",
        body: blocked,
      })
    ).status,
    409,
  );

  const intent = command();
  const results = await Promise.all(
    Array.from({ length: 8 }, () => submit(a.cookie, task.id, intent)),
  );
  const quote = check(results[0], 201);
  for (const result of results) assert.deepEqual(check(result, 201), quote);
  assert.equal(quote.totalCents, 5998);
  assert.equal(quote.revision, 1);
  assert.deepEqual(quote.items[0], {
    name: "更换接线端子",
    quantity: 3,
    unitPriceCents: 1999,
    note: "含安装",
    amountCents: 5997,
  });
  assert.equal(quote.actor.id, a.id);
  assert.equal(quote.currency, "CNY");
  assert.equal("requestHash" in quote, false);
  assert.equal("requestId" in quote, false);
  assert.deepEqual(check(await read(admin, task.id), 200), quote);
  assert.deepEqual(check(await read(a.cookie, task.id), 200), quote);
  check(
    await submit(a.cookie, task.id, {
      ...intent,
      items: [{ ...intent.items[0], note: "变更内容" }],
    }),
    409,
  );
  check(await submit(a.cookie, another.id, intent), 409);
  check(await submit(a.cookie, task.id), 409);
  const state = (
    await db.query(
      'SELECT "status","version",(SELECT COUNT(*)::int FROM "TicketQuote" WHERE "ticketId"=t."id") AS quotes,(SELECT COUNT(*)::int FROM "TicketResult" WHERE "ticketId"=t."id") AS results FROM "Ticket" t WHERE "id"=$1',
      [task.id],
    )
  ).rows[0];
  assert.deepEqual(state, {
    status: "processing",
    version: 3,
    quotes: 1,
    results: 0,
  });
  // Distinct intents compete for the first revision; only one can win.
  const competitors = await Promise.all(
    Array.from({ length: 8 }, () => submit(a.cookie, another.id)),
  );
  assert.equal(competitors.filter((r) => r.response.status === 201).length, 1);
  assert.equal(competitors.filter((r) => r.response.status === 409).length, 7);
  // Current ownership must still hold when replaying a previously successful command.
  await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE "id"=$2', [
    b.id,
    task.id,
  ]);
  check(await read(a.cookie, task.id), 404);
  check(await submit(a.cookie, task.id, intent), 404);

  const pending = await fixtures.task(a, { stage: "pending" });
  const assignIntent = {
    requestId: randomUUID(),
    expectedVersion: 0,
    assigneeId: a.id,
    serviceMode: "quoted",
  };
  for (const serviceMode of [null, "free", 1])
    check(
      await local.request(`/admin/tickets/${pending.id}/assign`, {
        cookie: admin,
        method: "POST",
        body: { ...assignIntent, serviceMode },
      }),
      400,
    );
  const assign = () =>
    local.request(`/admin/tickets/${pending.id}/assign`, {
      cookie: admin,
      method: "POST",
      body: assignIntent,
    });
  check(await assign(), 201);
  check(await assign(), 201);
  check(
    await local.request(`/admin/tickets/${pending.id}/assign`, {
      cookie: admin,
      method: "POST",
      body: { ...assignIntent, serviceMode: "direct" },
    }),
    409,
  );

  // Legacy no-mode assignment and direct processing still complete successfully.
  const result = check(
    await local.request(`/tasks/${direct.id}/result`, {
      cookie: a.cookie,
      method: "POST",
      body: { ...blocked, requestId: randomUUID() },
    }),
    201,
  );
  check(
    await local.request(`/tickets/${direct.id}/confirm`, {
      cookie: reporter,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: result.version },
    }),
    201,
  );
  console.log(
    "Quote API: money/DTO validation, scope, native result gate, same/distinct intent races, assignment mode replay, immutable first revision and direct legacy completion passed.",
  );
} finally {
  if (nativeToken)
    await nativeRequest("/mobile/auth/logout", {
      method: "POST",
      token: nativeToken,
    }).catch(() => {});
  await fixtures.cleanup();
  await db.end();
}

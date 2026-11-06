import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "task.native");
const tokens = [];
async function login(username) {
  const result = await nativeRequest("/mobile/auth/login", {
    method: "POST",
    body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
  });
  assert.equal(result.status, 200);
  tokens.push(result.value.accessToken);
  return result.value.accessToken;
}
try {
  await local.waitForApi();
  const tech = await fixtures.technician("原生任务维修甲"),
    other = await fixtures.technician("原生任务维修乙");
  const { reporter, admin } = await fixtures.identities();
  const assigned = await fixtures.task(tech, { stage: "assigned" });
  const processing = await fixtures.task(tech, { stage: "processing" });
  const otherTask = await fixtures.task(other, { stage: "assigned" });
  const pending = await fixtures.task(tech, { stage: "pending" });
  const a = await login(tech.id),
    b = await login(other.id),
    manager = await login("admin"),
    user = await login("reporter.a");
  const route = `/mobile/tasks/${assigned.id}/accept`;
  const command = {
    requestId: randomUUID(),
    expectedVersion: assigned.version,
  };
  const accept = (token, body = command, headers) =>
    nativeRequest(route, { method: "POST", token, body, headers });
  assert.equal((await nativeRequest("/mobile/tasks")).status, 401);
  for (const token of [manager, user]) {
    assert.equal((await nativeRequest("/mobile/tasks", { token })).status, 403);
    assert.equal((await accept(token)).status, 403);
  }
  const page = await nativeRequest("/mobile/tasks?page=1&pageSize=1", {
    token: a,
  });
  assert.equal(page.status, 200);
  assert.equal(page.value.total, 2);
  assert.equal(page.value.items.length, 1);
  const filtered = await nativeRequest("/mobile/tasks?status=assigned", {
    token: a,
  });
  assert.equal(filtered.value.total, 1);
  assert.equal(filtered.value.items[0].id, assigned.id);
  for (const id of [otherTask.id, pending.id, randomUUID()])
    assert.equal(
      (await nativeRequest(`/mobile/tasks/${id}`, { token: a })).status,
      404,
    );
  assert.equal((await accept(b)).status, 404);
  assert.equal(
    (await accept(a, { ...command, expectedVersion: 0 })).status,
    409,
  );
  assert.equal(
    (await accept(a, { ...command, assigneeId: other.id })).status,
    400,
  );
  for (const headers of [
    { Origin: "http://127.0.0.1:5173" },
    { Cookie: "dsh_session=invalid" },
    { "Sec-Fetch-Mode": "cors" },
  ])
    assert.equal((await accept(a, command, headers)).status, 403);
  assert.equal(
    (await nativeRequest("/mobile/tasks?page=0", { token: a })).status,
    400,
  );
  assert.equal(
    (await nativeRequest("/mobile/tasks?assigneeId=" + other.id, { token: a }))
      .status,
    400,
  );
  assert.deepEqual(
    (await nativeRequest("/mobile/devices", { token: a })).value,
    [],
  );
  const results = await Promise.all(Array.from({ length: 8 }, () => accept(a)));
  for (const result of results) {
    assert.equal(result.status, 201);
    assert.equal(result.value.status, "processing");
    assert.equal(result.value.version, assigned.version + 1);
    assert.equal(result.value.acceptance.actor.id, tech.id);
    assert.equal(
      result.value.acceptance.createdAt,
      results[0].value.acceptance.createdAt,
    );
    for (const key of ["reporter", "reporterId", "requestId", "assignment"])
      assert.equal(key in result.value, false);
  }
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int AS count FROM "TicketAcceptance" WHERE "ticketId"=$1',
        [assigned.id],
      )
    ).rows[0].count,
    1,
  );
  assert.equal(
    (await accept(a, { ...command, requestId: randomUUID() })).status,
    409,
  );
  assert.equal(
    (
      await nativeRequest(`/mobile/tasks/${processing.id}/accept`, {
        method: "POST",
        token: a,
        body: { requestId: randomUUID(), expectedVersion: processing.version },
      })
    ).status,
    409,
  );
  for (const [path, cookie] of [
    [`/tickets/${assigned.id}`, reporter],
    [`/admin/tickets/${assigned.id}`, admin],
  ]) {
    const value = (await local.request(path, { cookie })).value;
    assert.equal(value.status, "processing");
    assert.deepEqual(value.acceptance, results[0].value.acceptance);
  }
  // Only a generated fixture is reassigned to simulate external ownership changes.
  await db.query(
    'UPDATE "Ticket" SET "assigneeId"=$1,"version"="version"+1 WHERE "id"=$2',
    [other.id, assigned.id],
  );
  assert.equal((await accept(a)).status, 404);
  assert.equal(
    (await nativeRequest(`/mobile/tasks/${assigned.id}`, { token: b })).status,
    200,
  );
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Technician-only list/count/filter and owner-scoped detail",
          "Device access remains restricted; forged fields and browser transport rejected",
          "Eight same-intent acceptances create one audit record",
          "Stale/new intent conflicts, same Web progress, old owner replay rejected",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await fixtures.cleanup();
  await db.end();
}

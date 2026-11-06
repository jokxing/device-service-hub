import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "result.native");
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
  const tech = await fixtures.technician("原生结果维修甲"),
    other = await fixtures.technician("原生结果维修乙");
  const { admin, reporter } = await fixtures.identities();
  const task = await fixtures.task(tech),
    assigned = await fixtures.task(tech, { stage: "assigned" });
  const a = await login(tech.id),
    b = await login(other.id),
    manager = await login("admin"),
    user = await login("reporter.a");
  const route = `/mobile/tasks/${task.id}/result`;
  const input = {
    requestId: randomUUID(),
    expectedVersion: task.version,
    description: "  已检查接线。\n试运行正常。  ",
  };
  const submit = (token, body = input, headers) =>
    nativeRequest(route, { method: "POST", token, body, headers });
  assert.equal((await submit(undefined)).status, 401);
  for (const token of [manager, user])
    assert.equal((await submit(token)).status, 403);
  assert.equal((await submit(b)).status, 404);
  for (const headers of [
    { Origin: "http://127.0.0.1:5173" },
    { Cookie: "dsh_session=invalid" },
    { "Sec-Fetch-Mode": "cors" },
  ])
    assert.equal((await submit(a, input, headers)).status, 403);
  for (const description of ["", " \n\t ", "x".repeat(2001)])
    assert.equal((await submit(a, { ...input, description })).status, 400);
  for (const patch of [
    { actorId: other.id },
    { status: "confirming" },
    { attachments: [] },
  ])
    assert.equal((await submit(a, { ...input, ...patch })).status, 400);
  assert.equal((await submit(a, { ...input, expectedVersion: 1 })).status, 409);
  assert.equal(
    (
      await nativeRequest(`/mobile/tasks/${assigned.id}/result`, {
        method: "POST",
        token: a,
        body: { ...input, expectedVersion: assigned.version },
      })
    ).status,
    409,
  );
  const results = await Promise.all(Array.from({ length: 8 }, () => submit(a)));
  for (const result of results) {
    assert.equal(result.status, 201);
    assert.equal(result.value.status, "confirming");
    assert.equal(result.value.version, task.version + 1);
    assert.equal(result.value.result.description, input.description.trim());
    assert.equal(result.value.result.actor.id, tech.id);
    assert.deepEqual(result.value.result, results[0].value.result);
    assert.deepEqual(Object.keys(result.value.result).sort(), [
      "actor",
      "createdAt",
      "description",
    ]);
  }
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int AS count FROM "TicketResult" WHERE "ticketId"=$1',
        [task.id],
      )
    ).rows[0].count,
    1,
  );
  assert.equal(
    (await submit(a, { ...input, description: "Changed result" })).status,
    409,
  );
  assert.equal(
    (await submit(a, { ...input, requestId: randomUUID() })).status,
    409,
  );
  for (const [path, cookie] of [
    [`/tickets/${task.id}`, reporter],
    [`/admin/tickets/${task.id}`, admin],
  ]) {
    const value = (await local.request(path, { cookie })).value;
    assert.equal(value.status, "confirming");
    assert.deepEqual(value.result, results[0].value.result);
  }
  const own = await nativeRequest(`/mobile/tickets/${task.id}`, {
    token: user,
  });
  assert.deepEqual(own.value.result, results[0].value.result);
  const confirmed = await nativeRequest(`/mobile/tickets/${task.id}/confirm`, {
    method: "POST",
    token: user,
    body: { requestId: randomUUID(), expectedVersion: own.value.version },
  });
  assert.equal(confirmed.status, 201);
  const replay = await submit(a);
  assert.equal(replay.status, 201);
  assert.equal(replay.value.status, "completed");
  assert.deepEqual(replay.value.result, results[0].value.result);
  await db.query(
    'UPDATE "Ticket" SET "assigneeId"=$1,"version"="version"+1 WHERE "id"=$2',
    [other.id, task.id],
  );
  assert.equal((await submit(a)).status, 404);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Native role, ownership, browser and DTO boundaries",
          "Whitespace/length validation and stale-state rejection",
          "Eight same-intent results produce one immutable normalized record",
          "Three-role result consistency and reporter confirmation",
          "Successful replay cannot reopen or bypass current ownership",
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

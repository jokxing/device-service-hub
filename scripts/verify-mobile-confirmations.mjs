import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "confirm.native");
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
  const tech = await fixtures.technician("原生确认验收维修员");
  const { admin } = await fixtures.identities();
  const ticket = await fixtures.task(tech, { stage: "confirming" });
  const pending = await fixtures.task(tech, { stage: "pending" });
  const a = await login("reporter.a"),
    b = await login("reporter.b"),
    manager = await login("admin"),
    worker = await login("technician");
  const command = { requestId: randomUUID(), expectedVersion: ticket.version };
  const route = `/mobile/tickets/${ticket.id}/confirm`;
  const send = (token, body = command, headers) =>
    nativeRequest(route, { method: "POST", token, body, headers });
  assert.equal((await send(undefined)).status, 401);
  for (const token of [manager, worker])
    assert.equal((await send(token)).status, 403);
  assert.equal((await send(b)).status, 404);
  for (const headers of [
    { Origin: "http://127.0.0.1:5173" },
    { Cookie: "dsh_session=invalid" },
    { "Sec-Fetch-Mode": "cors" },
  ])
    assert.equal((await send(a, command, headers)).status, 403);
  assert.equal(
    (await send(a, { ...command, status: "completed" })).status,
    400,
  );
  assert.equal(
    (await send(a, { ...command, expectedVersion: ticket.version - 1 })).status,
    409,
  );
  assert.equal(
    (
      await nativeRequest(`/mobile/tickets/${pending.id}/confirm`, {
        method: "POST",
        token: a,
        body: { requestId: randomUUID(), expectedVersion: 0 },
      })
    ).status,
    409,
  );
  const own = await nativeRequest(`/mobile/tickets/${ticket.id}`, { token: a });
  assert.equal(own.value.status, "confirming");
  assert.ok(own.value.result);
  const results = await Promise.all(Array.from({ length: 8 }, () => send(a)));
  for (const result of results) {
    assert.equal(result.status, 201);
    assert.equal(result.value.status, "completed");
    assert.equal(result.value.version, ticket.version + 1);
    assert.equal(result.value.confirmation.actor.id, "user-reporter-a");
    assert.deepEqual(result.value.result, own.value.result);
    assert.equal("requestId" in result.value.confirmation, false);
  }
  assert.ok(
    results.every(
      (result) =>
        result.value.confirmation.createdAt ===
        results[0].value.confirmation.createdAt,
    ),
  );
  assert.equal(
    (
      await db.query(
        'SELECT count(*)::int AS count FROM "TicketConfirmation" WHERE "ticketId"=$1',
        [ticket.id],
      )
    ).rows[0].count,
    1,
  );
  assert.equal(
    (
      await send(a, {
        ...command,
        expectedVersion: command.expectedVersion + 1,
      })
    ).status,
    409,
  );
  assert.equal(
    (await send(a, { ...command, requestId: randomUUID() })).status,
    409,
  );
  assert.equal((await send(b)).status, 404);
  for (const [path, cookie] of [
    [`/admin/tickets/${ticket.id}`, admin],
    [`/tasks/${ticket.id}`, tech.cookie],
  ]) {
    const value = (await local.request(path, { cookie })).value;
    assert.equal(value.status, "completed");
    assert.deepEqual(value.confirmation, results[0].value.confirmation);
  }
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Native role, owner, DTO, browser and version boundaries",
          "Eight same-intent confirmations create one audit record",
          "Replay preserves result and confirmation time; new intent conflicts",
          "Web administrator and technician read same completion",
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

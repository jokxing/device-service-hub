import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest as request } from "./lib/native-api.mjs";
const local = openLocalApi();
const db = await local.connectDatabase();
const tokens = [];
const ids = [];
async function login(username) {
  const result = await request("/mobile/auth/login", {
    method: "POST",
    body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
  });
  assert.equal(result.status, 200);
  tokens.push(result.value.accessToken);
  return result.value.accessToken;
}
try {
  await local.waitForApi();
  const a = await login("reporter.a"),
    b = await login("reporter.b"),
    admin = await login("admin"),
    technician = await login("technician");
  const device = (await request("/mobile/devices", { token: a })).value[0];
  const input = {
    requestId: randomUUID(),
    deviceId: device.id,
    title: "Native API verification",
    description: "Temporary native transport verification",
    priority: "normal",
  };
  ids.push(input.requestId);
  assert.equal(
    (await request("/mobile/tickets", { method: "POST", body: input })).status,
    401,
  );
  for (const token of [admin, technician])
    for (const [route, method, body] of [
      ["/mobile/tickets", "POST", input],
      ["/mobile/tickets/mine", "GET", undefined],
    ])
      assert.equal((await request(route, { token, method, body })).status, 403);
  for (const headers of [
    { Origin: "http://127.0.0.1:5173" },
    { Cookie: "dsh_session=invalid" },
    { "Sec-Fetch-Mode": "cors" },
  ])
    assert.equal(
      (
        await request("/mobile/tickets", {
          method: "POST",
          token: a,
          body: input,
          headers,
        })
      ).status,
      403,
    );
  assert.equal(
    (
      await request("/mobile/tickets", {
        method: "POST",
        token: a,
        body: { ...input, reporterId: "user-reporter-b" },
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await request("/mobile/tickets", {
        method: "POST",
        token: b,
        body: input,
      })
    ).status,
    404,
  );
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () =>
      request("/mobile/tickets", { method: "POST", token: a, body: input }),
    ),
  );
  assert.equal(concurrent.filter((r) => r.status === 201).length, 1);
  assert.ok(concurrent.every((r) => [200, 201].includes(r.status)));
  const ticket = concurrent[0].value;
  assert.ok(concurrent.every((r) => r.value.id === ticket.id));
  assert.equal(ticket.status, "pending");
  assert.equal(
    (
      await request("/mobile/tickets", {
        method: "POST",
        token: a,
        body: { ...input, title: "Changed intent" },
      })
    ).status,
    409,
  );
  const own = await request("/mobile/tickets/" + ticket.id, { token: a });
  assert.equal(own.status, 200);
  assert.equal(own.value.title, input.title);
  for (const key of ["requestHash", "requestId", "reporterId"])
    assert.equal(key in own.value, false);
  assert.equal(
    (await request("/mobile/tickets/" + ticket.id, { token: b })).status,
    404,
  );
  assert.equal(
    (await request("/mobile/tickets/" + randomUUID(), { token: b })).status,
    404,
  );
  const page = await request("/mobile/tickets/mine?page=1&pageSize=1", {
    token: a,
  });
  assert.equal(page.status, 200);
  assert.equal(page.value.pageSize, 1);
  const other = await request("/mobile/tickets/mine?page=1&pageSize=50", {
    token: b,
  });
  assert.equal(
    other.value.items.some((t) => t.id === ticket.id),
    false,
  );
  assert.equal(
    (await request("/mobile/tickets/mine?page=0", { token: a })).status,
    400,
  );
  const web = await local.login("reporter.a");
  assert.equal(
    (await local.request("/tickets/" + ticket.id, { cookie: web })).value.id,
    ticket.id,
  );
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Native create and eight concurrent retries create one ticket",
          "Role, browser and ownership boundaries",
          "Pagination and cross-user 404",
          "Changed-payload conflict and private-field omission",
          "Same record visible through existing Web API",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await db.query('DELETE FROM "Ticket" WHERE "requestId"=ANY($1::uuid[])', [
    ids,
  ]);
  for (const token of tokens)
    await request("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await local.dispose();
  await db.end();
}

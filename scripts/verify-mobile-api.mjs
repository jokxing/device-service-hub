import assert from "node:assert/strict";
import { expectedLocalDeviceCodes } from "./lib/local-fixtures.mjs";
import { randomUUID, createHash } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest as request } from "./lib/native-api.mjs";
const local = openLocalApi();
const db = await local.connectDatabase();
const tokens = [];
const temporaryId = "native." + randomUUID().replaceAll("-", "");
const digest = (value) => createHash("sha256").update(value).digest("hex");
async function login(username, previous) {
  const result = await request("/mobile/auth/login", {
    method: "POST",
    token: previous,
    body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
  });
  assert.equal(result.status, 200);
  assert.ok(
    /^[a-f0-9]{64}$/.test(result.value.accessToken),
    "Native credential must be opaque",
  );
  assert.equal(result.headers["set-cookie"], undefined);
  assert.equal(result.headers["cache-control"], "no-store");
  assert.equal("passwordHash" in result.value.user, false);
  tokens.push(result.value.accessToken);
  return result.value.accessToken;
}
try {
  await local.waitForApi();
  const credentials = {
    username: "reporter.a",
    password: process.env.SEED_ACCOUNT_PASSWORD,
  };
  assert.equal(
    (
      await request("/mobile/auth/login", {
        method: "POST",
        body: { ...credentials, password: "incorrect-password" },
      })
    ).status,
    401,
  );
  assert.equal(
    (
      await request("/mobile/auth/login", {
        method: "POST",
        body: { ...credentials, role: "admin" },
      })
    ).status,
    400,
  );
  for (const headers of [
    { Origin: "https://untrusted.invalid" },
    { Origin: "http://127.0.0.1:5173" },
    { "Sec-Fetch-Mode": "cors" },
    { Cookie: "dsh_session=invalid" },
  ])
    assert.equal(
      (
        await request("/mobile/auth/login", {
          method: "POST",
          body: credentials,
          headers,
        })
      ).status,
      403,
    );
  assert.equal(
    (await request("/auth/login", { method: "POST", body: credentials }))
      .status,
    403,
  );
  assert.equal((await request("/mobile/devices")).status, 401);
  assert.equal(
    (
      await request("/mobile/auth/me", {
        headers: { Authorization: "Bearer invalid" },
      })
    ).status,
    401,
  );
  const accounts = [
    ["admin", await expectedLocalDeviceCodes(local.root)],
    ["reporter.a", ["AC-001"]],
    ["reporter.b", ["WP-002"]],
    ["technician", []],
  ];
  let tokenA;
  for (const [username, expected] of accounts) {
    const token = await login(username);
    const me = await request("/mobile/auth/me", { token });
    assert.equal(me.value.user.username, username);
    const devices = await request("/mobile/devices", { token });
    assert.equal(devices.status, 200);
    assert.deepEqual(
      devices.value.map((device) => device.code),
      expected,
    );
    if (username === "reporter.a") tokenA = token;
  }
  assert.equal(
    (await request("/devices", { token: tokenA })).status,
    401,
    "Web guard must not accept native transport",
  );
  assert.equal(
    (await request("/auth/logout", { method: "POST", token: tokenA })).status,
    403,
  );
  assert.equal(
    (await request("/mobile/devices/device-ac001", { token: tokenA })).status,
    200,
  );
  const denied = await request("/mobile/devices/device-wp002", {
    token: tokenA,
  });
  const unknown = await request("/mobile/devices/not-a-device", {
    token: tokenA,
  });
  assert.equal(denied.status, 404);
  assert.equal(unknown.status, 404);
  assert.equal(denied.value.message, unknown.value.message);
  assert.equal(
    (
      await request("/mobile/auth/me", {
        token: tokenA,
        headers: { Cookie: "dsh_session=invalid" },
      })
    ).status,
    403,
  );
  const rotated = await login("reporter.a", tokenA);
  assert.equal(
    (await request("/mobile/auth/me", { token: tokenA })).status,
    401,
  );
  assert.equal(
    (await request("/mobile/auth/logout", { method: "POST", token: rotated }))
      .status,
    204,
  );
  assert.equal(
    (await request("/mobile/auth/logout", { method: "POST", token: rotated }))
      .status,
    204,
  );
  assert.equal(
    (await request("/mobile/auth/me", { token: rotated })).status,
    401,
  );
  const expiring = await login("reporter.b");
  await db.query('UPDATE "Session" SET "expiresAt"=$1 WHERE "tokenHash"=$2', [
    new Date(0),
    digest(expiring),
  ]);
  assert.equal(
    (await request("/mobile/devices", { token: expiring })).status,
    401,
  );
  await db.query(
    'INSERT INTO "User" ("id","username","name","role","passwordHash","active") SELECT $1,$1,\'原生停用验收\',\'reporter\',"passwordHash",true FROM "User" WHERE "id"=\'user-reporter-a\'',
    [temporaryId],
  );
  const disabled = await login(temporaryId);
  await db.query('UPDATE "User" SET "active"=false WHERE "id"=$1', [
    temporaryId,
  ]);
  assert.equal(
    (await request("/mobile/auth/me", { token: disabled })).status,
    401,
  );
  assert.equal(
    (
      await request("/mobile/auth/login", {
        method: "POST",
        body: {
          username: temporaryId,
          password: process.env.SEED_ACCOUNT_PASSWORD,
        },
      })
    ).status,
    401,
  );
  const raw = await db.query(
    'SELECT "tokenHash" FROM "Session" WHERE "tokenHash"=$1',
    [digest(disabled)],
  );
  assert.equal(raw.rowCount, 1);
  assert.equal(raw.rows[0].tokenHash, digest(disabled));
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Native credential/no-store without Set-Cookie",
          "Browser/Origin/Cookie rejection and unchanged Web protection",
          "Four-role device scopes and cross-user 404",
          "Credential rotation, idempotent logout and expiry",
          "Disabled account denied and stored credential hashed",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  for (const token of tokens)
    await request("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await db.query('DELETE FROM "User" WHERE "id"=$1', [temporaryId]);
  await db.end();
}

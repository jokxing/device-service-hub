import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
const local = openLocalApi();
const db = await local.connectDatabase();
const tokens = [];
const id = "scan." + randomUUID();
const code = "OFF-" + randomUUID().slice(0, 8);
async function login(username) {
  const result = await nativeRequest("/mobile/auth/login", {
    method: "POST",
    body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
  });
  assert.equal(result.status, 200);
  tokens.push(result.value.accessToken);
  return result.value.accessToken;
}
const resolve = (token, code, headers) =>
  nativeRequest("/mobile/devices/resolve?code=" + encodeURIComponent(code), {
    token,
    headers,
  });
try {
  await local.waitForApi();
  const a = await login("reporter.a"),
    b = await login("reporter.b"),
    admin = await login("admin"),
    tech = await login("technician");
  assert.equal((await resolve(undefined, "AC-001")).status, 401);
  const own = await resolve(a, "AC-001");
  assert.equal(own.status, 200);
  assert.equal(own.value.id, "device-ac001");
  assert.equal("access" in own.value, false);
  const denied = await resolve(b, "AC-001"),
    missing = await resolve(b, "UNKNOWN-" + randomUUID());
  assert.equal(denied.status, 404);
  assert.deepEqual(denied.value, missing.value);
  assert.equal((await resolve(b, "WP-002")).status, 200);
  assert.equal((await resolve(admin, "AC-001")).status, 200);
  assert.equal((await resolve(admin, "WP-002")).status, 200);
  assert.equal((await resolve(tech, "AC-001")).status, 404);
  for (const invalid of [
    "",
    "https://example.com/AC-001",
    "AC-001\nWP-002",
    "x".repeat(65),
  ])
    assert.equal((await resolve(a, invalid)).status, 400);
  assert.equal(
    (
      await nativeRequest("/mobile/devices/resolve?code=AC-001&role=admin", {
        token: b,
      })
    ).status,
    400,
  );
  for (const headers of [
    { Origin: "http://127.0.0.1:5173" },
    { Cookie: "dsh_session=invalid" },
    { "Sec-Fetch-Mode": "cors" },
  ])
    assert.equal((await resolve(a, "AC-001", headers)).status, 403);
  await db.query(
    'INSERT INTO "Device" ("id","code","name","category","location","model","enabled") VALUES ($1,$2,$3,$4,$5,$6,false)',
    [id, code, "扫码停用设备验收", "空调设备", "验收位置", "验收型号"],
  );
  await db.query(
    'INSERT INTO "DeviceAccess" ("userId","deviceId") VALUES ($1,$2)',
    ["user-reporter-a", id],
  );
  assert.equal((await resolve(a, code)).value.enabled, false);
  await db.query(
    'DELETE FROM "DeviceAccess" WHERE "userId"=$1 AND "deviceId"=$2',
    ["user-reporter-a", id],
  );
  assert.equal((await resolve(a, code)).status, 404);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Code lookup reuses four-role device scope and same 404 for unknown/denied",
          "Invalid code, forged query, browser and Cookie transport rejected",
          "Disabled device remains visible but revoking grant denies lookup",
          "No grant list or private fields exposed",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await db.query('DELETE FROM "Device" WHERE "id"=$1', [id]);
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await db.end();
}

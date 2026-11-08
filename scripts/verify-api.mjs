import assert from "node:assert/strict";
import { expectedLocalDeviceCodes } from "./lib/local-fixtures.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFile(path.join(root, ".env"));
const base = "http://127.0.0.1:" + (process.env.API_PORT ?? "3001") + "/api";
const password = process.env.SEED_ACCOUNT_PASSWORD;
const statePath = path.join(root, ".local", "api-restart-verification.json");
const sessions = [];
const passed = [];
async function request(
  route,
  {
    cookie,
    method = "GET",
    body,
    origin = "http://127.0.0.1:5173",
    headers = {},
  } = {},
) {
  const response = await fetch(base + route, {
    method,
    headers: {
      ...(cookie ? { Cookie: cookie } : {}),
      ...(method !== "GET"
        ? { Origin: origin, "Content-Type": "application/json" }
        : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(10000),
  });
  const value = response.status === 204 ? undefined : await response.json();
  return { response, value };
}
async function login(username) {
  const result = await request("/auth/login", {
    method: "POST",
    body: { username, password },
  });
  assert.equal(
    result.response.status,
    200,
    "Login must succeed for seeded account",
  );
  const header = result.response.headers.get("set-cookie");
  assert.ok(header?.includes("HttpOnly") && header.includes("SameSite=Strict"));
  const cookie = header.split(";")[0];
  sessions.push(cookie);
  return { ...result, cookie };
}
async function logout(cookie) {
  await request("/auth/logout", { method: "POST", cookie });
}

try {
  if (process.argv.includes("--after-restart")) {
    const saved = JSON.parse(await fs.readFile(statePath, "utf8"));
    assert.equal(
      (await request("/auth/me", { cookie: saved.cookie })).response.status,
      200,
    );
    const list = await request("/devices", { cookie: saved.cookie });
    assert.deepEqual(
      list.value.map((device) => device.code),
      ["AC-001"],
    );
    await logout(saved.cookie);
    await fs.unlink(statePath);
    console.log(
      "PASS: API restart preserved database-backed session and authorized device data.",
    );
  } else {
    const anonymousDevices = await request("/devices");
    assert.equal(anonymousDevices.response.status, 401);
    assert.equal(
      anonymousDevices.response.headers.get("cache-control"),
      "no-store",
    );
    assert.equal(
      anonymousDevices.response.headers.get("x-content-type-options"),
      "nosniff",
    );
    assert.equal((await request("/devices/device-ac001")).response.status, 401);
    passed.push("未登录请求被服务端拒绝");
    const invalid = await request("/auth/login", {
      method: "POST",
      body: { username: "reporter.a", password: "invalid-password" },
    });
    assert.equal(invalid.response.status, 401);
    assert.equal(invalid.response.headers.get("set-cookie"), null);
    assert.equal(
      (
        await request("/auth/login", {
          method: "POST",
          body: { username: "reporter.a", password, role: "admin" },
        })
      ).response.status,
      400,
    );
    assert.equal(
      (
        await request("/auth/login", {
          method: "POST",
          origin: "https://untrusted.example",
          body: { username: "reporter.a", password },
        })
      ).response.status,
      403,
    );
    passed.push("错误密码、越权字段与跨来源登录被拒绝");

    const a = await login("reporter.a");
    assert.equal(a.value.user.id, "user-reporter-a");
    assert.equal("passwordHash" in a.value.user, false);
    assert.equal("token" in a.value, false);
    assert.equal(
      (await request("/auth/me", { cookie: a.cookie })).value.user.role,
      "reporter",
    );
    const listA = await request("/devices?role=admin", {
      cookie: a.cookie,
      headers: { "X-User-Id": "user-admin" },
    });
    assert.deepEqual(
      listA.value.map((device) => device.code),
      ["AC-001"],
    );
    assert.equal(
      "access" in listA.value[0] || "users" in listA.value[0],
      false,
    );
    assert.equal(
      (await request("/devices/device-ac001", { cookie: a.cookie })).response
        .status,
      200,
    );
    const inaccessible = await request("/devices/device-wp002", {
      cookie: a.cookie,
    });
    const missing = await request("/devices/not-a-device", {
      cookie: a.cookie,
    });
    assert.equal(inaccessible.response.status, 404);
    assert.equal(missing.response.status, 404);
    assert.equal(inaccessible.value.message, missing.value.message);
    passed.push("用户 A 仅能读取授权设备，伪造角色或直接改 ID 无效");

    const b = await login("reporter.b");
    assert.deepEqual(
      (await request("/devices", { cookie: b.cookie })).value.map(
        (device) => device.code,
      ),
      ["WP-002"],
    );
    assert.equal(
      (await request("/devices/device-ac001", { cookie: b.cookie })).response
        .status,
      404,
    );
    const admin = await login("admin");
    const expectedCodes = await expectedLocalDeviceCodes(root);
    assert.deepEqual(
      (await request("/devices", { cookie: admin.cookie })).value
        .map((device) => device.code)
        .sort(),
      expectedCodes.sort(),
    );
    const technician = await login("technician");
    assert.deepEqual(
      (await request("/devices", { cookie: technician.cookie })).value,
      [],
    );
    assert.equal(
      (await request("/devices/device-ac001", { cookie: technician.cookie }))
        .response.status,
      404,
    );
    passed.push("用户 B、管理员与维修人员各自的数据范围正确");

    await logout(a.cookie);
    assert.equal(
      (await request("/auth/me", { cookie: a.cookie })).response.status,
      401,
    );
    passed.push("退出登录后旧 Cookie 失效");

    const dbUrl = new URL(process.env.DATABASE_URL);
    assert.ok(
      dbUrl.hostname === "127.0.0.1" &&
        dbUrl.port === "55432" &&
        dbUrl.pathname === "/device_service_hub",
      "Verification mutations are restricted to this project local database",
    );
    const { Client } = createRequire(
      path.join(root, "apps", "api", "package.json"),
    )("pg");
    const database = new Client({ connectionString: process.env.DATABASE_URL });
    await database.connect();
    try {
      const token = technician.cookie.split("=")[1];
      await database.query(
        'UPDATE "Session" SET "expiresAt" = $1 WHERE "tokenHash" = $2',
        [new Date(0), createHash("sha256").update(token).digest("hex")],
      );
      assert.equal(
        (await request("/auth/me", { cookie: technician.cookie })).response
          .status,
        401,
      );
      const prior = await database.query(
        'SELECT "active" FROM "User" WHERE "id" = $1',
        ["user-reporter-b"],
      );
      try {
        await database.query(
          'UPDATE "User" SET "active" = false WHERE "id" = $1',
          ["user-reporter-b"],
        );
        assert.equal(
          (await request("/auth/me", { cookie: b.cookie })).response.status,
          401,
        );
      } finally {
        await database.query(
          'UPDATE "User" SET "active" = $1 WHERE "id" = $2',
          [prior.rows[0].active, "user-reporter-b"],
        );
      }
      passed.push("过期会话与停用账号不能继续读取数据");
    } finally {
      await database.end();
    }
    for (const cookie of sessions) await logout(cookie);
    sessions.length = 0;
    const persistence = await login("reporter.a");
    await fs.writeFile(
      statePath,
      JSON.stringify({ cookie: persistence.cookie }),
      { mode: 0o600 },
    );
    sessions.length = 0;
    console.log(
      JSON.stringify(
        {
          result: "passed",
          checks: passed,
          restartCheck:
            "Session saved only in ignored .local for a separate --after-restart check.",
        },
        null,
        2,
      ),
    );
  }
} finally {
  for (const cookie of sessions) await logout(cookie).catch(() => {});
}

import assert from "node:assert/strict";
import { nativeHttp } from "./lib/native-http.mjs";
import fs from "node:fs/promises";
import path from "node:path";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { createRemoteMobileGateway } from "./lib/remote-mobile-gateway.mjs";

const local = openLocalApi();
const config = JSON.parse(
  await fs.readFile(
    path.join(local.root, ".local/remote-mobile/accounts.json"),
    "utf8",
  ),
);
const db = await local.connectDatabase();
async function directRequest(route, { method, body }) {
  const response = await nativeHttp("http://127.0.0.1:3001/api" + route, {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { response, value: await response.json() };
}
const tokens = [],
  requestId = randomUUID();
const server = createRemoteMobileGateway(config);
server.listen(0, "127.0.0.1");
await once(server, "listening");
const base = process.argv.includes("--public")
  ? JSON.parse(
      await fs.readFile(
        path.join(local.root, ".local/remote-mobile/endpoint.json"),
        "utf8",
      ),
    ).url
  : `http://127.0.0.1:${server.address().port}`;
if (process.argv.includes("--public")) {
  const address = new URL(base);
  assert.ok(
    address.protocol === "https:" &&
      /^[a-z0-9-]+\.trycloudflare\.com$/.test(address.hostname) &&
      address.pathname === "/" &&
      !address.username &&
      !address.password &&
      !address.search &&
      !address.hash,
    "Only the configured temporary HTTPS tunnel may receive test credentials",
  );
}
async function call(route, { token, body, headers } = {}) {
  const response = await nativeHttp(base + route, {
    method: body ? "POST" : "GET",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const value = response.status === 204 ? undefined : await response.json();
  return { response, value };
}
try {
  await local.waitForApi();
  for (const route of ["/api/auth/login", "/api/admin/tickets", "/.env"])
    assert.equal((await call(route)).response.status, 404);
  assert.equal((await call("/api/mobile/devices")).response.status, 401);
  assert.equal(
    (
      await call("/api/mobile/auth/login", {
        body: {
          username: "reporter.a",
          password: process.env.SEED_ACCOUNT_PASSWORD,
        },
      })
    ).response.status,
    403,
  );
  assert.equal(
    (
      await call("/api/mobile/auth/login", {
        headers: { Origin: "https://example.test" },
        body: {
          username: config.accounts[0].username,
          password: "invalid-password",
        },
      })
    ).response.status,
    403,
  );
  const original = await directRequest("/mobile/auth/login", {
    method: "POST",
    body: {
      username: "reporter.a",
      password: process.env.SEED_ACCOUNT_PASSWORD,
    },
  });
  assert.equal(original.response.status, 200);
  tokens.push(original.value.accessToken);
  assert.equal(
    (await call("/api/mobile/devices", { token: original.value.accessToken }))
      .response.status,
    403,
  );
  for (const account of config.accounts) {
    const login = await call("/api/mobile/auth/login", {
      body: { username: account.username, password: account.password },
    });
    assert.equal(login.response.status, 200);
    assert.equal(login.value.user.id, account.id);
    const token = login.value.accessToken;
    tokens.push(token);
    const devices = await call("/api/mobile/devices", { token });
    assert.equal(devices.response.status, 200);
    assert.deepEqual(
      devices.value.map((item) => item.id),
      account.role === "reporter" ? [config.device.id] : [],
    );
    assert.equal(
      (await call("/api/mobile/devices/device-ac001", { token })).response
        .status,
      404,
    );
    if (account.role === "reporter") {
      const record = await call("/api/mobile/tickets", {
        token,
        body: {
          requestId,
          deviceId: config.device.id,
          title: "远程入口临时验收",
          description: "仅验证本机受限入口，未开放公网",
          priority: "normal",
        },
      });
      assert.equal(record.response.status, 201);
      assert.equal(
        (await call(`/api/mobile/tickets/${record.value.id}`, { token }))
          .response.status,
        200,
      );
      assert.equal(
        (await call(`/api/mobile/tickets/${record.value.id}/photos`, { token }))
          .response.status,
        200,
      );
    } else {
      assert.equal(
        (await call("/api/mobile/tasks", { token })).response.status,
        200,
      );
    }
    const logout = await nativeHttp(base + "/api/mobile/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });
    assert.equal(logout.status, 204);
    assert.equal(
      (await call("/api/mobile/auth/me", { token })).response.status,
      401,
    );
  }
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Only dedicated accounts can login or reuse Bearer sessions",
          "Web/admin/browser paths rejected; original native API unchanged",
          "Isolated device authorization, real text repair, photo list and technician tasks",
          "Logout revokes the test session; only this run's ticket is cleaned",
        ],
        transport: process.argv.includes("--public")
          ? "temporary-https-tunnel"
          : "local-only",
      },
      null,
      2,
    ),
  );
} finally {
  for (const token of tokens)
    await nativeHttp("http://127.0.0.1:3001/api/mobile/auth/logout", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    }).catch(() => {});
  await db.query(
    'DELETE FROM "Ticket" WHERE "requestId"=$1 AND "reporterId"=$2',
    [requestId, config.accounts[0].id],
  );
  await db.end();
  server.close();
  server.closeAllConnections();
  await local.dispose();
}

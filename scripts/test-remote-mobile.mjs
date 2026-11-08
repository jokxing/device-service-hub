import test from "node:test";
import { nativeHttp } from "./lib/native-http.mjs";
import assert from "node:assert/strict";
import http from "node:http";
import { once } from "node:events";
import { createRemoteMobileGateway } from "./lib/remote-mobile-gateway.mjs";

const account = {
  id: "remote-test-reporter-unit",
  username: "remote.reporter.1234abcd",
  role: "reporter",
};
const token = "a".repeat(64),
  oldToken = "b".repeat(64);
const config = () => ({
  accounts: [account],
  expiresAt: new Date(Date.now() + 60000).toISOString(),
});
async function request(base, route, { method = "GET", headers, body } = {}) {
  const response = await nativeHttp(base + route, {
    method,
    headers,
    ...(body === undefined ? {} : { body }),
  });
  return { response, data: await response.json() };
}
test("Remote gateway limits routes, browser headers, accounts, sessions, bodies and upstream failures", async () => {
  const received = [];
  let changedRole = false;
  const api = http.createServer(async (req, res) => {
    let body = "";
    for await (const chunk of req) body += chunk;
    received.push({
      url: req.url,
      method: req.method,
      headers: req.headers,
      body,
    });
    if (req.url === "/api/mobile/auth/me") {
      if (req.headers.authorization === `Bearer ${"c".repeat(64)}`) {
        res.writeHead(401);
        res.end("{}");
        return;
      }
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          user:
            req.headers.authorization === `Bearer ${token}`
              ? { ...account, ...(changedRole ? { role: "admin" } : {}) }
              : {
                  id: "user-reporter-a",
                  username: "reporter.a",
                  role: "reporter",
                },
        }),
      );
      return;
    }
    if (req.url === "/api/mobile/auth/login") {
      res.setHeader("Content-Type", "application/json");
      res.end(
        JSON.stringify({
          user: { ...account, ...(changedRole ? { role: "admin" } : {}) },
          accessToken: token,
        }),
      );
      return;
    }
    if (req.url === "/api/mobile/devices/disconnect") {
      req.socket.destroy();
      return;
    }
    res.writeHead(req.url?.includes("missing") ? 404 : 200, {
      "Content-Type": "application/json",
      "Set-Cookie": "must-not-leak=true",
    });
    res.end(
      JSON.stringify({
        method: req.method,
        url: req.url,
        body,
        contentType: req.headers["content-type"],
      }),
    );
  });
  api.listen(0, "127.0.0.1");
  await once(api, "listening");
  const server = createRemoteMobileGateway(config(), {
    apiPort: api.address().port,
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  const headers = { Authorization: `Bearer ${token}` };
  try {
    assert.equal((await request(base, "/health")).response.status, 200);
    for (const route of [
      "/",
      "/api/auth/me",
      "/api/admin/tickets",
      "/.env",
      "/api/mobile/devices/%2e%2e",
      "/api/mobile/devices/extra/path",
    ])
      assert.equal((await request(base, route)).response.status, 404);
    assert.equal(received.length, 0, "Blocked routes never reach API");
    assert.equal(
      (await request(base, "/api/mobile/devices", { method: "DELETE" }))
        .response.status,
      404,
    );
    for (const browserHeaders of [
      { Origin: "https://example.test" },
      { Cookie: "x=y" },
      { "Sec-Fetch-Site": "none" },
    ])
      assert.equal(
        (
          await request(base, "/api/mobile/devices", {
            headers: { ...headers, ...browserHeaders },
          })
        ).response.status,
        403,
      );
    assert.equal(
      (await request(base, "/api/mobile/devices")).response.status,
      401,
    );
    assert.equal(
      (
        await request(base, "/api/mobile/devices", {
          headers: { Authorization: `Bearer ${oldToken}` },
        })
      ).response.status,
      403,
    );
    assert.equal(
      (
        await request(base, "/api/mobile/devices", {
          headers: { Authorization: `Bearer ${"c".repeat(64)}` },
        })
      ).response.status,
      401,
    );
    const loginHeaders = { "Content-Type": "application/json" };
    const login = (body) =>
      request(base, "/api/mobile/auth/login", {
        method: "POST",
        headers: loginHeaders,
        body,
      });
    assert.equal(
      (
        await login(
          JSON.stringify({
            username: "reporter.a",
            password: "not-a-real-password",
          }),
        )
      ).response.status,
      403,
    );
    assert.equal(
      (
        await login(
          JSON.stringify({
            username: account.username,
            password: "test-password",
            role: "admin",
          }),
        )
      ).response.status,
      403,
    );
    assert.equal((await login("invalid-json")).response.status, 400);
    const input = JSON.stringify({
      username: account.username,
      password: "test-password",
    });
    assert.equal((await login(input)).response.status, 200);
    assert.equal(
      received.find((item) => item.url === "/api/mobile/auth/login").body,
      input,
    );
    const devices = await request(
      base,
      "/api/mobile/devices/resolve?code=RT-TEST",
      { headers },
    );
    assert.equal(devices.data.url, "/api/mobile/devices/resolve?code=RT-TEST");
    assert.equal(devices.response.headers.get("set-cookie"), null);
    assert.equal(devices.response.headers.get("cache-control"), "no-store");
    const multipart =
      '--unit-boundary\r\nContent-Disposition: form-data; name="file"; filename="x.png"\r\n\r\nunit-image\r\n--unit-boundary--\r\n';
    const photo = await request(
      base,
      "/api/mobile/tickets/unit-id/photos/photo-id",
      {
        method: "POST",
        headers: {
          ...headers,
          "Content-Type": "multipart/form-data; boundary=unit-boundary",
        },
        body: multipart,
      },
    );
    assert.equal(photo.data.body, multipart);
    assert.equal(
      photo.data.contentType,
      "multipart/form-data; boundary=unit-boundary",
    );
    assert.equal(
      (await request(base, "/api/mobile/devices/missing", { headers })).response
        .status,
      404,
    );
    assert.equal((await login("x".repeat(9000))).response.status, 413);
    assert.equal(
      (await request(base, "/api/mobile/devices/disconnect", { headers }))
        .response.status,
      502,
    );
    changedRole = true;
    assert.equal(
      (await request(base, "/api/mobile/devices", { headers })).response.status,
      403,
    );
    assert.equal((await login(input)).response.status, 403);
    assert.ok(
      received.some((item) => item.url === "/api/mobile/auth/logout"),
      "Unexpected login identity revoked",
    );
  } finally {
    server.close();
    server.closeAllConnections();
    api.close();
    api.closeAllConnections();
  }
});

test("Remote window and global login/request budgets fail closed", async () => {
  for (const options of [
    { now: () => Date.now() + 120000, status: 403 },
    { requestLimit: 0, status: 429 },
    { loginLimit: 0, status: 429 },
  ]) {
    const server = createRemoteMobileGateway(config(), options);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");
    try {
      assert.equal(
        (
          await request(
            `http://127.0.0.1:${server.address().port}`,
            "/api/mobile/auth/login",
            { method: "POST" },
          )
        ).response.status,
        options.status,
      );
    } finally {
      server.close();
      server.closeAllConnections();
    }
  }
});

import assert from "node:assert/strict";
import { test } from "node:test";
import { createServer, request } from "node:http";
import {
  createAlipayNotificationGateway,
  notificationPath,
} from "./lib/alipay-notification-gateway.mjs";

test("notification gateway preserves raw form and status, restricts path/method/credentials/size/window", async () => {
  let received = 0;
  const raw = "subject=%E7%BB%B4%E4%BF%AE%2B%26&sign=a%2Bb%3D";
  const target = createServer((req, res) => {
    received++;
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => {
      assert.equal(body, raw);
      assert.equal(req.url, notificationPath);
      res.writeHead(409, { "Content-Type": "text/plain" }).end("conflict");
    });
  });
  await new Promise((resolve) => target.listen(0, "127.0.0.1", resolve));
  const results = [];
  const gateway = createAlipayNotificationGateway({
    targetPort: target.address().port,
    expiresAt: Date.now() + 60000,
    onResult: (result) => results.push(result),
  });
  await new Promise((resolve) => gateway.listen(0, "127.0.0.1", resolve));
  const send = (
    path = notificationPath,
    method = "POST",
    headers = {},
    body = raw,
  ) =>
    new Promise((resolve, reject) => {
      const req = request(
        {
          hostname: "127.0.0.1",
          port: gateway.address().port,
          path,
          method,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...headers,
          },
        },
        (res) => {
          let text = "";
          res.on("data", (chunk) => {
            text += chunk;
          });
          res.on("end", () => resolve({ status: res.statusCode, text }));
        },
      );
      req.on("error", reject);
      req.end(body);
    });
  try {
    assert.deepEqual(await send(), { status: 409, text: "conflict" });
    for (const path of [
      "/",
      "/api/auth/login",
      notificationPath + "?x=1",
      notificationPath + "/",
      "/api/orders",
    ])
      assert.equal((await send(path)).status, 404);
    assert.equal((await send(notificationPath, "GET", {}, "")).status, 405);
    for (const headers of [
      { Origin: "https://example.com" },
      { Cookie: "x=y" },
      { Authorization: "Bearer x" },
      { "Sec-Fetch-Mode": "cors" },
    ])
      assert.equal((await send(notificationPath, "POST", headers)).status, 403);
    assert.equal(
      (
        await send(notificationPath, "POST", {
          "Content-Type": "application/json",
        })
      ).status,
      415,
    );
    assert.equal(
      (await send(notificationPath, "POST", {}, "a".repeat(16385))).status,
      413,
    );
    assert.equal(received, 1);
    assert.equal(results[0].status, 409);
  } finally {
    await Promise.all([
      new Promise((resolve) => gateway.close(resolve)),
      new Promise((resolve) => target.close(resolve)),
    ]);
  }
  const expired = createAlipayNotificationGateway({
    expiresAt: Date.now() - 1,
  });
  await new Promise((resolve) => expired.listen(0, "127.0.0.1", resolve));
  try {
    assert.equal(
      (await fetch(`http://127.0.0.1:${expired.address().port}`)).status,
      503,
    );
  } finally {
    await new Promise((resolve) => expired.close(resolve));
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import http from "node:http";
import { once } from "node:events";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMicroServer } from "./lib/micro-server.mjs";

test("Unified artifacts, route fallbacks, missing files and transparent API forwarding", async () => {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const upstream = http.createServer((req, res) => {
    if (req.url === "/api/disconnect") {
      req.socket.destroy();
      return;
    }
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      res.writeHead(401, {
        "Content-Type": "application/json",
        "Set-Cookie": "test=opaque; HttpOnly; Path=/api; SameSite=Strict",
        "Cache-Control": "no-store",
      });
      res.end(
        JSON.stringify({
          method: req.method,
          url: req.url,
          origin: req.headers.origin,
          cookie: req.headers.cookie,
          body,
        }),
      );
    });
  });
  upstream.listen(0, "127.0.0.1");
  await once(upstream, "listening");
  const server = createMicroServer(root, upstream.address().port);
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = "http://127.0.0.1:" + server.address().port;
  try {
    for (const route of [
      "/",
      "/tickets/login",
      "/tickets/service/tasks/example",
      "/devices/device-ac001",
    ]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.match(response.headers.get("content-type"), /text\/html/);
      assert.match(await response.text(), /<div id="shell-root">/);
    }
    for (const app of ["tickets", "devices"]) {
      const response = await fetch(base + `/micro-assets/${app}/`);
      assert.equal(response.status, 200);
      assert.match(await response.text(), new RegExp(app + "\\.umd\\.js"));
      const js = await fetch(base + `/micro-assets/${app}/${app}.umd.js`);
      assert.equal(js.status, 200);
      assert.match(js.headers.get("content-type"), /javascript/);
      await js.arrayBuffer();
    }
    for (const route of [
      "/assets/missing.js",
      "/micro-assets/devices/missing.js",
      "/micro-assets/unknown/",
      "/.env",
      "/micro-assets/devices/%2e%2e%2findex.html",
    ]) {
      const response = await fetch(base + route);
      assert.equal(response.status, 404);
      assert.equal(await response.text(), "Not found");
    }
    const response = await fetch(base + "/api/auth/login?check=1", {
      method: "POST",
      headers: {
        Origin: "https://untrusted.example",
        Cookie: "session=opaque",
        "Content-Type": "application/json",
      },
      body: '{"test":true}',
    });
    assert.equal(response.status, 401);
    assert.match(response.headers.get("set-cookie"), /HttpOnly/);
    assert.deepEqual(await response.json(), {
      method: "POST",
      url: "/api/auth/login?check=1",
      origin: "https://untrusted.example",
      cookie: "session=opaque",
      body: '{"test":true}',
    });
    const failure = await fetch(base + "/api/disconnect");
    assert.equal(failure.status, 502);
    await failure.json();
    const head = await fetch(base + "/devices/device-ac001", {
      method: "HEAD",
    });
    assert.equal(head.status, 200);
    assert.equal(await head.text(), "");
  } finally {
    server.close();
    server.closeAllConnections();
    upstream.close();
    upstream.closeAllConnections();
  }
});

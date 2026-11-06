import assert from "node:assert/strict";
import path from "node:path";
import { loadEnvFile } from "node:process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

/** Integration helpers are intentionally restricted to the isolated project database. */
export function openLocalApi() {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  loadEnvFile(path.join(root, ".env"));
  const url = new URL(process.env.DATABASE_URL);
  assert.ok(
    url.hostname === "127.0.0.1" &&
      url.port === "55432" &&
      url.pathname === "/device_service_hub",
    "Tests require the project local database",
  );
  const base = "http://127.0.0.1:" + (process.env.API_PORT ?? "3001") + "/api";
  const sessions = [];
  async function waitForApi() {
    for (let attempt = 0; attempt < 6; attempt++) {
      try {
        const response = await fetch(base + "/auth/me", {
          signal: AbortSignal.timeout(2000),
        });
        await response.body?.cancel();
        if (response.status === 401 || response.status === 200) return;
      } catch {
        // Development builds may replace the listening process; only retry this read.
      }
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
    throw new Error("Local API is not ready for verification");
  }
  async function request(route, { cookie, method = "GET", body } = {}) {
    const response = await fetch(base + route, {
      method,
      headers: {
        ...(cookie ? { Cookie: cookie } : {}),
        ...(method !== "GET"
          ? {
              Origin: "http://127.0.0.1:5173",
              "Content-Type": "application/json",
            }
          : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    return {
      response,
      value: response.status === 204 ? undefined : await response.json(),
    };
  }
  async function login(username) {
    const result = await request("/auth/login", {
      method: "POST",
      body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
    });
    assert.equal(
      result.response.status,
      200,
      "Seed account login must succeed",
    );
    const cookie = result.response.headers.get("set-cookie")?.split(";")[0];
    assert.ok(cookie);
    sessions.push(cookie);
    return cookie;
  }
  async function logout(cookie) {
    return request("/auth/logout", { method: "POST", cookie });
  }
  async function dispose(keep) {
    for (const cookie of sessions)
      if (cookie !== keep) await logout(cookie).catch(() => {});
  }
  async function connectDatabase() {
    const { Client } = createRequire(path.join(root, "apps/api/package.json"))(
      "pg",
    );
    const database = new Client({ connectionString: process.env.DATABASE_URL });
    await database.connect();
    return database;
  }
  return { root, request, login, logout, dispose, connectDatabase, waitForApi };
}

import http from "node:http";
import { nativeHttp } from "./native-http.mjs";

const id = "[A-Za-z0-9_-]{1,128}";
const routes = [
  ["GET", /^\/api\/mobile\/auth\/me$/],
  ["POST", /^\/api\/mobile\/auth\/(login|logout)$/],
  ["GET", new RegExp(`^/api/mobile/devices(/(${id}))?$`)],
  ["GET", new RegExp(`^/api/mobile/tickets/(mine|${id})(/photos(/${id})?)?$`)],
  ["POST", /^\/api\/mobile\/tickets$/],
  ["POST", new RegExp(`^/api/mobile/tickets/${id}/(confirm|photos/${id})$`)],
  ["GET", new RegExp(`^/api/mobile/tasks(/${id})?$`)],
  ["POST", new RegExp(`^/api/mobile/tasks/${id}/(accept|result)$`)],
];

export function createRemoteMobileGateway(
  config,
  { apiPort = 3001, now = Date.now, requestLimit = 180, loginLimit = 12 } = {},
) {
  if (
    !config.accounts?.length ||
    !Number.isFinite(Date.parse(config.expiresAt))
  )
    throw new Error("Invalid remote test configuration");
  const accounts = new Map();
  for (const account of config.accounts) {
    if (
      !/^remote\.(reporter|technician)\.[a-f0-9]{8}$/.test(account.username) ||
      !["reporter", "technician"].includes(account.role) ||
      !account.id?.startsWith("remote-test-")
    )
      throw new Error("Only dedicated remote test accounts are permitted");
    accounts.set(account.username, account);
  }
  let windowStart = now(),
    requests = 0,
    logins = 0;
  const server = http.createServer(async (req, res) => {
    const reply = (status, value) => {
      if (res.destroyed || res.writableEnded) return;
      res.writeHead(status, {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(JSON.stringify(value));
    };
    if (req.method === "GET" && req.url === "/health") {
      reply(200, { status: "ok", mode: "remote-mobile-test" });
      return;
    }
    if (now() >= Date.parse(config.expiresAt)) {
      reply(403, { message: "远程测试窗口已结束" });
      return;
    }
    if (now() - windowStart >= 60000) {
      windowStart = now();
      requests = 0;
      logins = 0;
    }
    if (++requests > requestLimit) {
      reply(429, { message: "请求过于频繁，请稍后重试" });
      return;
    }
    const rawPath = req.url?.split("?")[0] ?? "";
    if (
      req.url?.length > 2048 ||
      !routes.some(
        ([method, pattern]) => method === req.method && pattern.test(rawPath),
      )
    ) {
      reply(404, { message: "接口未开放" });
      return;
    }
    // Never erase browser headers and thereby turn a browser call into a native call.
    if (
      req.headers.origin !== undefined ||
      req.headers.cookie !== undefined ||
      Object.keys(req.headers).some((key) => key.startsWith("sec-fetch-"))
    ) {
      reply(403, { message: "此入口仅供原生客户端使用" });
      return;
    }
    const login = rawPath === "/api/mobile/auth/login";
    if (login && ++logins > loginLimit) {
      reply(429, { message: "登录尝试过于频繁" });
      return;
    }
    const abort = new AbortController();
    const timeout = setTimeout(() => abort.abort(), 20000);
    res.on("close", () => {
      if (!res.writableEnded) abort.abort();
    });
    const upstream = (route, options = {}) =>
      nativeHttp(`http://127.0.0.1:${apiPort}${route}`, {
        ...options,
        signal: abort.signal,
        redirect: "error",
      });
    try {
      let authorization;
      if (!login) {
        authorization = req.headers.authorization;
        if (!/^Bearer [a-f0-9]{64}$/.test(authorization ?? "")) {
          reply(401, { message: "请先登录" });
          return;
        }
        const identity = await upstream("/api/mobile/auth/me", {
          headers: { Authorization: authorization },
        });
        if (identity.status !== 200) {
          await identity.arrayBuffer();
          reply(identity.status === 401 ? 401 : 502, {
            message: "会话校验失败",
          });
          return;
        }
        const { user } = await identity.json();
        const allowed = accounts.get(user?.username);
        if (!allowed || user.id !== allowed.id || user.role !== allowed.role) {
          reply(403, { message: "仅限独立远程测试账号" });
          return;
        }
      }
      const limit = /\/photos\//.test(rawPath) ? 6 * 1024 * 1024 : 8192;
      const declared = Number(req.headers["content-length"] ?? 0);
      if (!Number.isFinite(declared) || declared > limit) {
        reply(413, { message: "请求内容过大" });
        return;
      }
      let length = 0;
      const chunks = [];
      for await (const chunk of req) {
        length += chunk.length;
        if (length > limit) {
          reply(413, { message: "请求内容过大" });
          return;
        }
        chunks.push(chunk);
      }
      let body = Buffer.concat(chunks);
      if (login) {
        if (!req.headers["content-type"]?.startsWith("application/json")) {
          reply(415, { message: "需要 JSON 登录请求" });
          return;
        }
        let input;
        try {
          input = JSON.parse(body.toString("utf8"));
        } catch {
          reply(400, { message: "登录参数无效" });
          return;
        }
        if (
          !input ||
          Array.isArray(input) ||
          Object.keys(input).some(
            (key) => !["username", "password"].includes(key),
          ) ||
          !accounts.has(input.username) ||
          typeof input.password !== "string"
        ) {
          reply(403, { message: "仅限独立远程测试账号" });
          return;
        }
        body = Buffer.from(JSON.stringify(input));
      }
      const response = await upstream(req.url, {
        method: req.method,
        headers: {
          ...(authorization ? { Authorization: authorization } : {}),
          ...(req.headers["content-type"]
            ? { "Content-Type": req.headers["content-type"] }
            : {}),
        },
        ...(req.method === "POST" ? { body } : {}),
      });
      const data = Buffer.from(await response.arrayBuffer());
      if (login && response.status === 200) {
        const result = JSON.parse(data.toString("utf8"));
        const allowed = accounts.get(result.user?.username);
        if (
          !allowed ||
          result.user.id !== allowed.id ||
          result.user.role !== allowed.role
        ) {
          // Revoke any session if an account was changed locally since provisioning.
          if (/^[a-f0-9]{64}$/.test(result.accessToken ?? ""))
            await upstream("/api/mobile/auth/logout", {
              method: "POST",
              headers: { Authorization: `Bearer ${result.accessToken}` },
            });
          reply(403, { message: "测试账号配置不一致" });
          return;
        }
      }
      if (!res.destroyed) {
        res.writeHead(response.status, {
          "Content-Type":
            response.headers.get("content-type") ?? "application/json",
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        });
        res.end(data);
      }
    } catch {
      reply(502, { message: "测试服务暂时不可用，请核对实际操作结果后再试" });
    } finally {
      clearTimeout(timeout);
    }
  });
  server.requestTimeout = 25000;
  server.headersTimeout = 10000;
  server.maxConnections = 16;
  return server;
}

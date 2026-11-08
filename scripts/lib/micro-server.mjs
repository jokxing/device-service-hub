import http from "node:http";
import path from "node:path";
import { readFile, realpath } from "node:fs/promises";

const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
};

// Local production-artifact check, not a replacement for a production reverse proxy.
export function createMicroServer(root, apiPort = 3001) {
  return http.createServer(async (req, res) => {
    const requestPath = req.url?.split("?")[0];
    if (requestPath === "/api" || requestPath?.startsWith("/api/")) {
      const upstream = http.request(
        {
          hostname: "127.0.0.1",
          port: apiPort,
          path: req.url,
          method: req.method,
          headers: req.headers,
        },
        (reply) => {
          res.writeHead(reply.statusCode ?? 502, reply.headers);
          reply.pipe(res);
          reply.on("error", () => res.destroy());
        },
      );
      upstream.setTimeout(15000, () =>
        upstream.destroy(new Error("API timeout")),
      );
      upstream.on("error", () => {
        if (res.headersSent) res.destroy();
        else {
          res.writeHead(502, {
            "Content-Type": "application/json",
            "Cache-Control": "no-store",
          });
          res.end(JSON.stringify({ message: "本地 API 暂时不可用" }));
        }
      });
      req.on("aborted", () => upstream.destroy());
      res.on("close", () => {
        if (!res.writableEnded) upstream.destroy();
      });
      req.pipe(upstream);
      return;
    }
    if (!["GET", "HEAD"].includes(req.method)) {
      res.writeHead(405, { Allow: "GET, HEAD" });
      res.end();
      return;
    }
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://127.0.0.1").pathname,
      );
      if (
        pathname.includes("\\") ||
        pathname.includes("\0") ||
        pathname.split("/").includes("..")
      )
        throw new Error("Invalid path");
      let directory = path.join(root, "apps/shell/dist/unified");
      let relative = pathname.slice(1);
      const app = pathname.match(/^\/micro-assets\/(tickets|devices)\/(.*)$/);
      if (app) {
        directory = path.join(
          root,
          app[1] === "tickets"
            ? "apps/web/dist/micro"
            : "apps/devices/dist/micro",
        );
        relative = app[2] || "index.html";
      } else if (pathname.startsWith("/micro-assets"))
        throw new Error("Unknown asset");
      else if (
        pathname === "/" ||
        /^\/(tickets|devices)(\/|$)/.test(pathname)
      ) {
        if (!path.extname(pathname)) relative = "index.html";
      }
      const base = await realpath(directory);
      const target = await realpath(path.resolve(directory, relative));
      if (!target.startsWith(base + path.sep))
        throw new Error("Outside artifact root");
      const content = await readFile(target);
      res.writeHead(200, {
        "Content-Type":
          mime[path.extname(target)] ?? "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch {
      res.writeHead(404, {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(req.method === "HEAD" ? undefined : "Not found");
    }
  });
}

import { createServer, request } from "node:http";

export const notificationPath = "/api/payments/alipay-sandbox/notify";

// Expose a single signed-channel endpoint, never the general API or portal.
export function createAlipayNotificationGateway({
  targetPort = 3001,
  expiresAt,
  onResult = () => {},
}) {
  return createServer((incoming, outgoing) => {
    outgoing.setHeader("Cache-Control", "no-store");
    if (Date.now() >= expiresAt) {
      outgoing.writeHead(503).end("Test window expired");
      return;
    }
    if (incoming.url !== notificationPath) {
      outgoing.writeHead(404).end("Not found");
      return;
    }
    if (incoming.method !== "POST") {
      outgoing.writeHead(405, { Allow: "POST" }).end("Method not allowed");
      return;
    }
    if (
      incoming.headers.origin !== undefined ||
      incoming.headers.cookie !== undefined ||
      incoming.headers.authorization !== undefined ||
      Object.keys(incoming.headers).some((key) => key.startsWith("sec-fetch-"))
    ) {
      outgoing.writeHead(403).end("Channel notifications only");
      return;
    }
    if (
      !/^application\/x-www-form-urlencoded(?:\s*;|$)/i.test(
        incoming.headers["content-type"] ?? "",
      )
    ) {
      outgoing.writeHead(415).end("Form required");
      return;
    }
    const chunks = [];
    let size = 0;
    incoming.on("data", (chunk) => {
      size += chunk.length;
      if (size <= 16384) chunks.push(chunk);
    });
    incoming.on("end", () => {
      if (size > 16384) {
        outgoing.writeHead(413).end("Too large");
        return;
      }
      const body = Buffer.concat(chunks);
      const upstream = request(
        {
          hostname: "127.0.0.1",
          port: targetPort,
          path: notificationPath,
          method: "POST",
          headers: {
            "Content-Type": incoming.headers["content-type"],
            "Content-Length": body.length,
            ...(incoming.headers["content-encoding"]
              ? { "Content-Encoding": incoming.headers["content-encoding"] }
              : {}),
          },
          timeout: 15000,
        },
        (response) => {
          outgoing.writeHead(response.statusCode ?? 502, {
            "Content-Type":
              response.headers["content-type"] ?? "text/plain; charset=utf-8",
          });
          response.pipe(outgoing);
          response.on("end", () =>
            onResult({
              at: new Date().toISOString(),
              status: response.statusCode,
            }),
          );
          response.on("error", () => outgoing.destroy());
        },
      );
      upstream.on("timeout", () => upstream.destroy());
      upstream.on("error", () => {
        if (!outgoing.headersSent)
          outgoing.writeHead(502).end("Upstream unavailable");
        else outgoing.destroy();
      });
      // No retries: only Alipay decides whether to deliver the notification again.
      upstream.end(body);
    });
    incoming.on("error", () => outgoing.destroy());
  });
}

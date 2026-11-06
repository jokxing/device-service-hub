import http from "node:http";

/** Local emulator-only failure injection. No credentials are logged or persisted. */
export function createNativeGateway(onResponse) {
  const sessions = [];
  const server = http.createServer((incoming, outgoing) => {
    const chunks = [];
    incoming.on("data", (chunk) => chunks.push(chunk));
    incoming.on("end", () => {
      const raw = Buffer.concat(chunks);
      let input;
      try {
        input = JSON.parse(raw.toString());
      } catch {}
      const upstream = http.request(
        {
          hostname: "127.0.0.1",
          port: 3001,
          path: incoming.url,
          method: incoming.method,
          headers: {
            ...incoming.headers,
            host: "127.0.0.1:3001",
            connection: "close",
          },
        },
        (response) => {
          const chunks = [];
          response.on("data", (chunk) => chunks.push(chunk));
          response.on("end", () => {
            const buffer = Buffer.concat(chunks);
            let value;
            try {
              value = JSON.parse(buffer.toString());
            } catch {}
            if (incoming.url === "/api/mobile/auth/login" && value?.accessToken)
              sessions.push(value.accessToken);
            const message = onResponse({
              path: incoming.url,
              method: incoming.method,
              input,
              status: response.statusCode,
              value,
            });
            if (message) {
              outgoing.writeHead(502, {
                "Content-Type": "application/json",
                "Cache-Control": "no-store",
              });
              outgoing.end(JSON.stringify({ message }));
              return;
            }
            outgoing.writeHead(response.statusCode, response.headers);
            outgoing.end(buffer);
          });
        },
      );
      upstream.on("error", () => {
        outgoing.writeHead(502, { "Content-Type": "application/json" });
        outgoing.end("{}");
      });
      upstream.setTimeout(15000, () => upstream.destroy());
      upstream.end(raw);
    });
  });
  return {
    sessions,
    start: () =>
      new Promise((resolve, reject) => {
        server.once("error", reject);
        server.listen(3002, "127.0.0.1", resolve);
      }),
    close: async () => {
      server.closeAllConnections();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

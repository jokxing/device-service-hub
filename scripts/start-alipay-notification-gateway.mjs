import fs from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { createAlipayNotificationGateway } from "./lib/alipay-notification-gateway.mjs";

const directory = new URL("../.local/payments/", import.meta.url);
await fs.mkdir(directory, { recursive: true });
const expiresAt = Date.now() + 4 * 60 * 60 * 1000;
const server = createAlipayNotificationGateway({
  expiresAt,
  onResult: (result) =>
    fs
      .appendFile(
        new URL("notification-results.jsonl", directory),
        JSON.stringify(result) + "\n",
      )
      .catch(() => console.error("Notification result log unavailable")),
});
server.requestTimeout = 20000;
server.headersTimeout = 15000;
server.on("error", () => {
  console.error("Notification gateway failed to start");
  process.exitCode = 1;
});
server.listen(4302, "127.0.0.1", async () => {
  await fs.writeFile(
    new URL("notification-window.json", directory),
    JSON.stringify(
      {
        pid: process.pid,
        port: 4302,
        expiresAt: new Date(expiresAt).toISOString(),
        log: fileURLToPath(new URL("notification-results.jsonl", directory)),
      },
      null,
      2,
    ),
  );
  console.log(
    "Notification-only gateway ready on 127.0.0.1:4302; expires " +
      new Date(expiresAt).toISOString(),
  );
});
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close();
    server.closeIdleConnections();
  });

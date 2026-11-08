import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createRemoteMobileGateway } from "./lib/remote-mobile-gateway.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const config = JSON.parse(
  await fs.readFile(
    path.join(root, ".local/remote-mobile/accounts.json"),
    "utf8",
  ),
);
if (Date.now() >= Date.parse(config.expiresAt))
  throw new Error("Remote test window has expired; no gateway started");
const server = createRemoteMobileGateway(config);
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? "4301 已被占用，未启动第二个测试入口。"
      : "Remote test gateway failed.",
  );
  process.exitCode = 1;
});
server.listen(4301, "127.0.0.1", () =>
  console.log(
    "Local mobile test gateway: http://127.0.0.1:4301/health. No public tunnel started.",
  ),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close();
    server.closeIdleConnections();
  });

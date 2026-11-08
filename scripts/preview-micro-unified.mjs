import path from "node:path";
import { fileURLToPath } from "node:url";
import { access } from "node:fs/promises";
import { createMicroServer } from "./lib/micro-server.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
for (const file of [
  "apps/shell/dist/unified/index.html",
  "apps/web/dist/micro/index.html",
  "apps/devices/dist/micro/index.html",
])
  await access(path.join(root, file));
const server = createMicroServer(root);
server.on("error", (error) => {
  console.error(
    error.code === "EADDRINUSE"
      ? "4174 已被占用，请先停止 preview:shell 或旧统一入口。"
      : error.message,
  );
  process.exitCode = 1;
});
server.listen(4174, "127.0.0.1", () =>
  console.log("Unified production preview: http://127.0.0.1:4174"),
);
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => {
    server.close();
    server.closeIdleConnections();
  });

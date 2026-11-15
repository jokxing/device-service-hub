import { spawn, execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { openLocalAndroid } from "./lib/android-local.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const android = openLocalAndroid();
let metro;
async function ready() {
  try {
    const response = await fetch("http://127.0.0.1:8081/status", {
      signal: AbortSignal.timeout(1500),
    });
    return (await response.text()) === "packager-status:running";
  } catch {
    return false;
  }
}
try {
  android.connect();
  if (!(await ready())) {
    metro = spawn(process.execPath, [
      path.join(root, "node_modules/expo/bin/cli"),
      "start", "--localhost", "--port", "8081",
    ], {
      cwd: path.join(root, "apps/mobile"),
      env: { ...process.env, CI: "1" },
      stdio: "inherit",
      windowsHide: true,
    });
    metro.on("error", (error) => console.error(error.message));
    let available = false;
    for (let attempt = 0; attempt < 60; attempt++) {
      if (metro.exitCode !== null) throw new Error("Metro 启动失败，请检查上方输出。");
      if (await ready()) { available = true; break; }
      await delay(1000);
    }
    if (!available) throw new Error("Metro 启动超时，请检查 8081 端口。");
  } else {
    console.log("复用已运行的 Metro（8081），请保持原窗口运行。");
  }
  execFileSync(process.execPath, [path.join(root, "scripts/open-mobile-android.mjs")], {
    stdio: "inherit", windowsHide: true,
  });
  console.log("模拟器项目已打开。原生调试 8081；RN Web 独立使用 8082。业务操作需要本地数据库/API 运行。");
  if (metro) {
    console.log("请保持此窗口运行；Ctrl+C 停止本次启动的 Metro。");
    process.on("SIGINT", () => { metro.kill(); process.exit(0); });
    process.on("SIGTERM", () => { metro.kill(); process.exit(0); });
  }
} catch (error) {
  metro?.kill();
  console.error(error.message);
  process.exitCode = 1;
}

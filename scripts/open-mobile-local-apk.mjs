import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { openLocalAndroid } from "./lib/android-local.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const info = JSON.parse(
  fs.readFileSync(
    path.join(root, ".local/artifacts/android/build-info-local.json"),
    "utf8",
  ),
);
const expected = path.join(
  root,
  ".local/artifacts/android/device-service-hub-local-sdk.apk",
);
if (
  path.resolve(info.apk) !== expected ||
  info.apiUrl !== "http://127.0.0.1:3001/api" ||
  createHash("sha256").update(fs.readFileSync(expected)).digest("hex") !==
    info.sha256
)
  throw new Error("本地安装包信息不匹配，请先运行 build:mobile:apk:local。");
const android = openLocalAndroid();
android.connect();
android.run(["install", "-r", expected]);
android.run(["reverse", "tcp:3001", "tcp:3001"]);
android.run([
  "shell",
  "am",
  "start",
  "-W",
  "-a",
  "android.intent.action.VIEW",
  "-d",
  "deviceservicehub:///devices",
  "-p",
  "com.deviceservicehub.app",
]);
console.log(
  "已安装并打开本地原生 APK。保持数据库和 API 运行即可，无需 Metro；此命令可退出。",
);

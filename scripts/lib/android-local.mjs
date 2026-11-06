import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

export function openLocalAndroid() {
  const root = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    "../..",
  );
  const configPath = path.join(root, ".local/android-device.json");
  const config = fs.existsSync(configPath)
    ? JSON.parse(fs.readFileSync(configPath, "utf8"))
    : {};
  const adbPath = process.env.DSH_ADB_PATH ?? config.adbPath;
  const serial = process.env.DSH_ANDROID_SERIAL ?? config.serial;
  if (
    !adbPath ||
    !path.isAbsolute(adbPath) ||
    !fs.existsSync(adbPath) ||
    !serial
  )
    throw new Error(
      "Configure an existing ADB path and device serial in ignored .local/android-device.json or DSH_ADB_PATH/DSH_ANDROID_SERIAL.",
    );
  const env = { ...process.env };
  for (const [name, directory] of Object.entries({
    TEMP: "temp",
    TMP: "temp",
    APPDATA: "appdata",
    LOCALAPPDATA: "localappdata",
    ANDROID_USER_HOME: "android-user",
    ANDROID_SDK_HOME: "android-user",
  })) {
    env[name] = path.join(root, ".local", directory);
    fs.mkdirSync(env[name], { recursive: true });
  }
  function run(args, binary = false) {
    return execFileSync(adbPath, ["-s", serial, ...args], {
      env,
      windowsHide: true,
      timeout: 20000,
      maxBuffer: 16 * 1024 * 1024,
      encoding: binary ? undefined : "utf8",
    });
  }
  function capture(name, temporary = false) {
    if (!/^[a-z0-9-]+\.png$/.test(name))
      throw new Error("Invalid screenshot name");
    const output = path.join(
      root,
      temporary ? ".local" : "docs/screenshots",
      name,
    );
    fs.mkdirSync(path.dirname(output), { recursive: true });
    fs.writeFileSync(output, run(["exec-out", "screencap", "-p"], true));
    return output;
  }
  function hierarchy() {
    const target = "/sdcard/device-service-hub-ui.xml";
    run(["shell", "rm", "-f", target]);
    try {
      run(["shell", "uiautomator", "dump", target]);
    } catch (error) {
      // MuMu Android 15 can exit on SIGBUS/SIGSEGV after writing a complete new dump.
      if (
        ![135, 139].includes(error.status) ||
        !String(error.stdout).includes("UI hierchary dumped to: " + target)
      )
        throw error;
    }
    const xml = run(["shell", "cat", target]);
    if (!xml.startsWith("<?xml") || !xml.includes("</hierarchy>"))
      throw new Error("Incomplete Android UI dump");
    return xml;
  }
  return { run, capture, hierarchy };
}

import assert from "node:assert/strict";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
import { openLocalApi } from "./lib/local-api.mjs";
const android = openLocalAndroid(),
  ui = openAndroidUi(android),
  local = openLocalApi();
const granted = /android\.permission\.CAMERA: granted=true/.test(
  android.run(["shell", "dumpsys", "package", "host.exp.exponent"]),
);
try {
  await local.waitForApi();
  await ui.openLogin();
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "AC-001");
  // Scoped, reversible permission change; never clear Expo Go app data.
  android.run([
    "shell",
    "pm",
    "grant",
    "host.exp.exponent",
    "android.permission.CAMERA",
  ]);
  await ui.launch("devices");
  await ui.waitFor("AC-001");
  await ui.tap("扫码查看设备");
  await ui.tap("开启相机扫码");
  let prompt = android.hierarchy().match(/<node[^>]*text="ALLOW"[^>]*>/)?.[0];
  if (prompt) {
    ui.tapNode(prompt);
    await ui.pause();
  }
  await ui.waitFor("相机已就绪");
  android.capture("mobile-device-camera-preview.png", true); // Camera frames remain private.
  await ui.enter("设备编号或二维码内容", "AC-001");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.waitFor("识别已暂停");
  android.run([
    "shell",
    "pm",
    "revoke",
    "host.exp.exponent",
    "android.permission.CAMERA",
  ]);
  await ui.launch("devices");
  await ui.waitFor("AC-001");
  await ui.tap("扫码查看设备");
  await ui.tap("开启相机扫码");
  let xml;
  for (let attempt = 0; attempt < 6; attempt++) {
    xml = android.hierarchy();
    if (xml.includes("相机权限未开启")) break;
    const deny = [...xml.matchAll(/<node[^>]*>/g)]
      .map(([node]) => node)
      .find((node) =>
        /resource-id="[^"]*permission_deny_button"|text="(?:不允许|DENY|Don.t allow)"/.test(
          node,
        ),
      );
    if (deny) {
      ui.tapNode(deny);
      break;
    }
    await ui.pause();
  }
  xml = await ui.waitFor("相机权限未开启");
  assert.ok(xml.includes("设备编号或二维码内容"));
  android.capture("mobile-android-camera-denied.png");
  await ui.enter("设备编号或二维码内容", "AC-001");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.tap("查看设备");
  await ui.waitFor("KFR-120LW");
  await ui.launch("devices");
  await ui.waitFor("AC-001");
  await ui.tap("退出登录");
  await ui.waitFor("登录设备服务");
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Native camera preview ready",
          "Typing pauses camera",
          "Permission denied retains manual lookup",
          "Original camera permission restored",
        ],
        limits: ["No optical live QR decode or physical phone verification"],
      },
      null,
      2,
    ),
  );
} catch (error) {
  android.capture("mobile-device-camera-failure.png", true);
  throw error;
} finally {
  android.run([
    "shell",
    "pm",
    granted ? "grant" : "revoke",
    "host.exp.exponent",
    "android.permission.CAMERA",
  ]);
}

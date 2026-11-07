import assert from "node:assert/strict";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
import { openLocalApi } from "./lib/local-api.mjs";
const android = openLocalAndroid(),
  ui = openAndroidUi(android),
  local = openLocalApi();
async function input(value) {
  await ui.enter("设备编号或二维码内容", value);
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.tap("查看设备");
}
try {
  await local.waitForApi();
  await ui.openLogin();
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "AC-001");
  await ui.tap("扫码查看设备");
  await ui.waitFor("仅识别本平台设备二维码");
  android.capture("mobile-android-device-scan.png");
  await input("https://example.com/AC-001");
  await ui.waitFor("请输入设备编号或本平台设备二维码内容");
  await input("WP-002");
  await ui.waitFor("设备不存在或无权访问");
  android.capture("mobile-android-device-scan-denied.png");
  await input("device-service-hub:v1:AC-001");
  await ui.waitFor("KFR-120LW");
  assert.equal(android.hierarchy().includes("发起文字报修"), true);
  android.capture("mobile-android-scan-device-detail.png");
  await ui.launch("devices");
  await ui.waitFor("AC-001");
  await ui.tap("扫码查看设备");
  await input("AC-001");
  await ui.waitFor("KFR-120LW");
  await ui.launch("devices");
  await ui.waitFor("AC-001");
  await ui.tap("退出登录");
  await ui.waitFor("登录设备服务");
  console.log(
    JSON.stringify(
      {
        result: "passed",
        environment: "Android emulator + Expo Go",
        checks: [
          "External URL rejected locally",
          "Unauthorized device denied",
          "Canonical tag and plain code resolve real authorized detail",
          "Report entry preserved",
        ],
        limits: [
          "Manual input verifies lookup; optical QR recognition requires separate camera verification",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  android.capture("mobile-device-scan-failure.png", true);
  throw error;
} finally {
  android.run(["reverse", "tcp:3001", "tcp:3001"]);
}

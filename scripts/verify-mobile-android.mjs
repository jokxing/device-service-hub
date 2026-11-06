import assert from "node:assert/strict";
import { openLocalAndroid } from "./lib/android-local.mjs";
const android = openLocalAndroid();
const pause = () => new Promise((resolve) => setTimeout(resolve, 1000));
async function waitFor(text) {
  for (let attempt = 0; attempt < 8; attempt++) {
    const xml = android.hierarchy();
    if (xml.includes(text)) return xml;
    await pause();
  }
  throw new Error("Android screen does not contain expected text: " + text);
}
try {
  android.run(["reverse", "tcp:8081", "tcp:8081"]);
  android.run(["shell", "am", "force-stop", "host.exp.exponent"]);
  await pause();
  android.run([
    "shell",
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    "exp://127.0.0.1:8081/--/",
    "-p",
    "host.exp.exponent",
  ]);
  // Expo Go preserves the previous route and scroll offset between launches.
  const initial = android.hierarchy();
  if (initial.includes('text="报修须知"') && initial.includes("提交前准备"))
    android.run(["shell", "input", "keyevent", "4"]);
  const initialSize = android.run(["shell", "wm", "size"]).match(/(\d+)x(\d+)/);
  assert.ok(initialSize);
  for (let attempt = 0; attempt < 2; attempt++)
    android.run([
      "shell",
      "input",
      "swipe",
      String(Math.round(Number(initialSize[1]) / 2)),
      String(Math.round(Number(initialSize[2]) * 0.25)),
      String(Math.round(Number(initialSize[1]) / 2)),
      String(Math.round(Number(initialSize[2]) * 0.85)),
      "300",
    ]);
  await waitFor("让每一次报修都有回应");
  android.capture("mobile-android-home.png");
  let xml = android.hierarchy();
  const resolution = android.run(["shell", "wm", "size"]).match(/(\d+)x(\d+)/);
  assert.ok(resolution);
  const width = Number(resolution[1]),
    height = Number(resolution[2]);
  for (
    let attempt = 0;
    !xml.includes('text="查看报修须知"') &&
    !xml.includes('content-desc="查看报修须知"') &&
    attempt < 3;
    attempt++
  ) {
    android.run([
      "shell",
      "input",
      "swipe",
      String(Math.round(width / 2)),
      String(Math.round(height * 0.8)),
      String(Math.round(width / 2)),
      String(Math.round(height * 0.35)),
      "300",
    ]);
    await pause();
    xml = android.hierarchy();
  }
  const node = xml.match(
    /<node[^>]*(?:text|content-desc)="查看报修须知"[^>]*>/,
  )?.[0];
  const bounds = node?.match(/bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"/);
  assert.ok(bounds, "Guide link must be visible on the native screen");
  android.run([
    "shell",
    "input",
    "tap",
    String(Math.round((Number(bounds[1]) + Number(bounds[3])) / 2)),
    String(Math.round((Number(bounds[2]) + Number(bounds[4])) / 2)),
  ]);
  await waitFor("服务角色与访问范围");
  android.capture("mobile-android-guide.png");
  android.run(["shell", "input", "keyevent", "4"]);
  await waitFor("查看报修须知");
  console.log(
    JSON.stringify(
      {
        result: "passed",
        environment: "Android emulator + Expo Go",
        checks: [
          "Native home renders",
          "Guide route opens by touch",
          "Android Back returns to home",
        ],
        excludes: ["device API", "physical device", "standalone APK"],
      },
      null,
      2,
    ),
  );
} catch (error) {
  android.capture("mobile-android-failure.png", true);
  throw error;
}

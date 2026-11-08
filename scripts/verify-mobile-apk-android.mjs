import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
import { openLocalApi } from "./lib/local-api.mjs";

const android = openLocalAndroid(),
  ui = openAndroidUi(android),
  local = openLocalApi();
const db = await local.connectDatabase();
const config = JSON.parse(
  await fs.readFile(
    path.join(local.root, ".local/remote-mobile/accounts.json"),
    "utf8",
  ),
);
const build = JSON.parse(
  await fs.readFile(
    path.join(local.root, ".local/artifacts/android/build-info.json"),
    "utf8",
  ),
);
const title = "APK-" + randomUUID().slice(0, 8),
  description = "APK-HTTPS-verification";
const reporter = config.accounts.find((account) => account.role === "reporter"),
  technician = config.accounts.find((account) => account.role === "technician");
let record;
async function launch(route) {
  android.run(["shell", "am", "force-stop", "com.deviceservicehub.app"]);
  await ui.pause();
  android.run([
    "shell",
    "am",
    "start",
    "-W",
    "-a",
    "android.intent.action.VIEW",
    "-d",
    "deviceservicehub:///" + route,
    "-p",
    "com.deviceservicehub.app",
  ]);
  await ui.pause();
}
async function logout() {
  await launch("devices");
  await ui.tap("退出登录");
  await ui.waitFor("登录设备服务");
}
try {
  await local.waitForApi();
  assert.equal(build.metroRequired, false);
  assert.equal(
    createHash("sha256")
      .update(await fs.readFile(build.apk))
      .digest("hex"),
    build.sha256,
    "Host APK matches build metadata",
  );
  const installedPath = android
    .run(["shell", "pm", "path", "com.deviceservicehub.app"])
    .split(/\r?\n/)
    .find((line) => line.endsWith("/base.apk"))
    ?.replace(/^package:/, "");
  assert.ok(installedPath);
  assert.equal(
    android.run(["shell", "sha256sum", installedPath]).split(/\s/)[0],
    build.sha256,
    "Installed APK is the delivered artifact",
  );
  const forwards = android.run(["reverse", "--list"]);
  assert.equal(
    /tcp:(8081|3001)\b/.test(forwards),
    false,
    "APK verification has no Metro/API reverse forwarding",
  );
  const pkg = android.run([
    "shell",
    "dumpsys",
    "package",
    "com.deviceservicehub.app",
  ]);
  assert.ok(pkg.includes("versionName=0.1.0"));
  assert.equal(
    /(?:pkgFlags|flags)=\[[^\]]*DEBUGGABLE/.test(pkg),
    false,
    "Installed app is not a debug build",
  );
  await launch("devices");
  if (android.hierarchy().includes('content-desc="退出登录"'))
    await ui.tap("退出登录");
  await ui.waitFor("登录设备服务");
  android.capture("mobile-apk-login.png");
  await ui.login(reporter.username, reporter.password, config.device.code);
  assert.equal(android.hierarchy().includes("AC-001"), false);
  android.capture("mobile-apk-devices.png");
  await ui.tap("查看设备详情");
  await ui.waitFor("REMOTE-TEST");
  await ui.tap("发起文字报修");
  await ui.enter("问题标题", title);
  await ui.enter("问题描述", description);
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.tap("提交报修");
  await ui.waitFor("报修详情");
  await ui.waitFor(title);
  const rows = (
    await db.query(
      'SELECT "id","requestId","version" FROM "Ticket" WHERE "reporterId"=$1 AND "title"=$2 AND "description"=$3',
      [reporter.id, title, description],
    )
  ).rows;
  assert.equal(rows.length, 1);
  record = rows[0];
  android.capture("mobile-apk-repair.png");
  await launch("tickets/" + record.id);
  await ui.waitFor(title);
  const admin = await local.login("admin");
  const assignment = await local.request(`/admin/tickets/${record.id}/assign`, {
    cookie: admin,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: record.version,
      assigneeId: technician.id,
    },
  });
  assert.equal(assignment.response.status, 201);
  await logout();
  await ui.login(technician.username, technician.password, "我的任务");
  await ui.waitFor(title);
  await ui.tap("查看任务详情");
  await ui.tap("接单");
  await ui.tap("确认接单");
  await ui.waitFor("处理中");
  await ui.tap("提交处理结果");
  await ui.enter("处理说明", "APK-verified-and-fixed");
  android.run(["shell", "input", "keyevent", "4"]);
  await ui.tap("提交结果");
  await ui.waitFor("待确认");
  android.capture("mobile-apk-task-result.png");
  await logout();
  await ui.login(reporter.username, reporter.password, config.device.code);
  await launch("tickets/" + record.id);
  await ui.waitFor(title);
  await ui.tap("确认维修完成");
  await ui.tap("确认完成");
  await ui.waitFor("已完成");
  const completed = (
    await db.query(
      'SELECT t."status",c."id" FROM "Ticket" t JOIN "TicketConfirmation" c ON c."ticketId"=t."id" WHERE t."id"=$1',
      [record.id],
    )
  ).rows;
  assert.equal(completed.length, 1);
  assert.equal(completed[0].status, "completed");
  android.capture("mobile-apk-completed.png");
  await logout();
  const appPid = android
    .run(["shell", "pidof", "com.deviceservicehub.app"])
    .trim();
  assert.match(appPid, /^\d+$/);
  const log = android.run([
    "logcat",
    "-d",
    "--pid",
    appPid,
    "-t",
    "150",
    "AndroidRuntime:E",
    "*:S",
  ]);
  assert.equal(log.includes("FATAL EXCEPTION"), false);
  await fs.writeFile(
    path.join(local.root, ".local/artifacts/android/verification.json"),
    JSON.stringify(
      {
        result: "passed",
        verifiedAt: new Date().toISOString(),
        sha256: build.sha256,
        environment: "MuMu Android 15 standalone signed release APK",
        connection: "HTTPS restricted tunnel; no ADB reverse; no Expo Go",
        checks: [
          "Cold launch and native login",
          "Dedicated device scope",
          "Real text repair and cold restart",
          "Local administrator assignment",
          "APK technician acceptance and result",
          "APK reporter confirmation and logout",
        ],
        notVerified: [
          "Physical Android camera",
          "Physical handset installation",
          "iOS native",
        ],
      },
      null,
      2,
    ),
  );
  console.log(
    "PASS: signed standalone APK on MuMu, HTTPS repair→assignment→acceptance→result→confirmation; no Metro/API reverse forwarding.",
  );
} catch (error) {
  await fs.writeFile(
    path.join(local.root, ".local/mobile-apk-error.txt"),
    String(error),
  );
  try {
    android.capture("mobile-apk-failure.png", true);
    await fs.writeFile(
      path.join(local.root, ".local/mobile-apk-failure.xml"),
      android.hierarchy(),
    );
  } catch {
    /* Diagnostic capture must not hide the original failure. */
  }
  throw error;
} finally {
  if (!record) {
    const candidates = (
      await db.query(
        'SELECT "id","requestId" FROM "Ticket" WHERE "reporterId"=$1 AND "title"=$2 AND "description"=$3',
        [reporter.id, title, description],
      )
    ).rows;
    if (candidates.length === 1) record = candidates[0];
  }
  if (record)
    await db.query(
      'DELETE FROM "Ticket" WHERE "id"=$1 AND "requestId"=$2 AND "reporterId"=$3',
      [record.id, record.requestId, reporter.id],
    );
  await local.dispose();
  await db.end();
}

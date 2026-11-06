import { openAndroidUi } from "./lib/android-ui.mjs";
import assert from "node:assert/strict";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openLocalApi } from "./lib/local-api.mjs";
const android = openLocalAndroid();
const local = openLocalApi();
const db = await local.connectDatabase();
const sessions = new Set();
const { waitFor, tap, enter, launch, pause } = openAndroidUi(android);
async function sessionIds(userId) {
  return (
    await db.query('SELECT "id" FROM "Session" WHERE "userId"=$1', [userId])
  ).rows.map((row) => row.id);
}
async function login(username, id, expectedCode) {
  const before = new Set(await sessionIds(id));
  await enter("账号", username);
  await enter("密码", process.env.SEED_ACCOUNT_PASSWORD);
  android.run(["shell", "input", "keyevent", "4"]);
  await tap("登录");
  const xml = await waitFor(expectedCode);
  const created = (await sessionIds(id)).filter((value) => !before.has(value));
  assert.equal(
    created.length,
    1,
    "Exactly one new session must belong to this login attempt",
  );
  sessions.add(created[0]);
  return { id: created[0], xml };
}
try {
  await local.waitForApi();
  await launch("devices");
  let screen = android.hierarchy();
  for (
    let attempt = 0;
    !screen.includes('content-desc="退出登录"') &&
    !screen.includes("登录设备服务") &&
    attempt < 12;
    attempt++
  ) {
    await pause();
    screen = android.hierarchy();
  }
  if (screen.includes('content-desc="退出登录"')) await tap("退出登录");
  await waitFor("登录设备服务");
  android.capture("mobile-android-login.png");
  await enter("账号", "reporter.a");
  await enter("密码", "incorrect-password");
  android.run(["shell", "input", "keyevent", "4"]);
  await tap("登录");
  await waitFor("账号或密码错误");
  const accountA = await login("reporter.a", "user-reporter-a", "AC-001");
  assert.equal(accountA.xml.includes("WP-002"), false);
  android.capture("mobile-android-devices.png");
  await tap("查看设备详情");
  await waitFor("KFR-120LW");
  android.capture("mobile-android-device-detail.png");
  // A process restart proves SecureStore recovery rather than in-memory identity.
  await launch("devices");
  await waitFor("AC-001");
  assert.ok((await sessionIds("user-reporter-a")).includes(accountA.id));
  await tap("退出登录");
  await waitFor("登录设备服务");
  assert.equal(
    (await sessionIds("user-reporter-a")).includes(accountA.id),
    false,
  );
  await launch("devices");
  await waitFor("登录设备服务");
  const accountB = await login("reporter.b", "user-reporter-b", "WP-002");
  assert.equal(accountB.xml.includes("AC-001"), false);
  await db.query('UPDATE "Session" SET "expiresAt"=$1 WHERE "id"=$2', [
    new Date(0),
    accountB.id,
  ]);
  await tap("刷新设备");
  await waitFor("登录设备服务");
  await launch("devices");
  await waitFor("登录设备服务");
  console.log(
    JSON.stringify(
      {
        result: "passed",
        environment: "MuMu Android + Expo Go",
        checks: [
          "Wrong password rejected",
          "Real login and scoped device/detail",
          "Cold restart restores SecureStore session",
          "Logout revokes server session and clears persisted identity",
          "Account switch clears old device data",
          "401 clears identity and survives restart",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  android.capture("mobile-native-auth-failure.png", true);
  throw error;
} finally {
  if (sessions.size)
    await db.query('DELETE FROM "Session" WHERE "id"=ANY($1::text[])', [
      [...sessions],
    ]);
  await db.end();
}

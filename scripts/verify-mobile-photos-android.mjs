import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { openLocalAndroid } from "./lib/android-local.mjs";
import { openAndroidUi } from "./lib/android-ui.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { createNativeGateway } from "./lib/native-gateway.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  android = openLocalAndroid(),
  ui = openAndroidUi(android);
const requestId = randomUUID(),
  filename = `device-hub-photo-${requestId}.png`,
  fixture = path.join(local.root, ".local", filename),
  remote = "/sdcard/Download/" + filename;
let ticketId,
  token,
  drop = true,
  imageReads = 0;
const gateway = createNativeGateway((event) => {
  if (
    event.method === "GET" &&
    /\/photos\/[a-f0-9-]+$/.test(event.path) &&
    event.status === 200
  )
    imageReads++;
  if (
    drop &&
    event.method === "POST" &&
    event.path.includes("/photos/") &&
    event.status === 201
  ) {
    drop = false;
    return "验收：上传响应已丢失，请保留照片重试";
  }
});
async function pick() {
  await ui.tap("从相册选择");
  await ui.waitFor("此应用只能访问您选择的照片");
  // This fixture was scanned last; choose the newest image, never inspect other images.
  const node = [...android.hierarchy().matchAll(/<node[^>]*>/g)]
    .map(([node]) => node)
    .find((node) => /content-desc="拍摄于 [^"]+的照片"/.test(node));
  assert.ok(node, "Newly pushed fixture must appear in Android photo picker");
  ui.tapNode(node);
  await ui.waitFor("上传现场照片");
}
async function count() {
  return Number(
    (
      await db.query('SELECT count(*) FROM "TicketPhoto" WHERE "ticketId"=$1', [
        ticketId,
      ])
    ).rows[0].count,
  );
}
try {
  await local.waitForApi();
  await gateway.start();
  const auth = await nativeRequest("/mobile/auth/login", {
    method: "POST",
    body: {
      username: "reporter.a",
      password: process.env.SEED_ACCOUNT_PASSWORD,
    },
  });
  assert.equal(auth.status, 200);
  token = auth.value.accessToken;
  const ticket = await nativeRequest("/mobile/tickets", {
    token,
    method: "POST",
    body: {
      requestId,
      deviceId: "device-ac001",
      title: "Photo Android verification",
      description: "Temporary photo upload verification",
      priority: "normal",
    },
  });
  assert.equal(ticket.status, 201);
  ticketId = ticket.value.id;
  await sharp({
    create: { width: 480, height: 320, channels: 3, background: "#3463eb" },
  })
    .png()
    .toFile(fixture);
  android.run(["push", fixture, remote]);
  android.run([
    "shell",
    "am",
    "broadcast",
    "-a",
    "android.intent.action.MEDIA_SCANNER_SCAN_FILE",
    "-d",
    "file://" + remote,
  ]);
  await ui.openLogin(3002);
  await ui.login("reporter.a", process.env.SEED_ACCOUNT_PASSWORD, "AC-001");
  await ui.launch("tickets/" + ticketId, 3002);
  await ui.waitFor("Photo Android verification");
  await pick();
  await ui.tap("取消");
  assert.equal(await count(), 0);
  await pick();
  android.capture("mobile-android-photo-preview.png");
  await ui.tap("确认上传");
  await ui.waitFor("验收：上传响应已丢失");
  assert.equal(await count(), 1);
  await ui.tap("确认上传");
  await ui.reveal("1 / 3");
  await ui.reveal("已上传现场照片");
  assert.equal(await count(), 1);
  assert.ok(imageReads > 0);
  android.capture("mobile-android-photo-uploaded.png");
  await ui.launch("tickets/" + ticketId, 3002);
  await ui.reveal("1 / 3");
  await ui.reveal("已上传现场照片");
  const cookie = await local.login("admin");
  const assign = await local.request(`/admin/tickets/${ticketId}/assign`, {
    cookie,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: 0,
      assigneeId: "user-technician",
    },
  });
  assert.equal(assign.response.status, 201);
  await ui.launch("tickets/" + ticketId, 3002);
  const readonly = await ui.reveal("1 / 3");
  assert.equal(readonly.includes('content-desc="拍照补充"'), false);
  await ui.openLogin(3002);
  await ui.login("technician", process.env.SEED_ACCOUNT_PASSWORD, "我的任务");
  await ui.launch("tasks/" + ticketId, 3002);
  const task = await ui.reveal("1 / 3");
  assert.equal(task.includes('content-desc="从相册选择"'), false);
  await ui.reveal("已上传现场照片");
  android.capture("mobile-android-task-photo.png");
  console.log(
    JSON.stringify(
      {
        result: "passed",
        environment: "MuMu + Expo Go, system image picker",
        checks: [
          "Cancel leaves zero photos",
          "Real File multipart upload and authenticated image display",
          "Lost successful response retries same photo ID with one stored row",
          "Cold restart restores photo from API",
          "Assignment disables reporter additions; current technician reads photo",
        ],
        limits: [
          "Fixture selected from system gallery; physical camera capture not verified by this script",
        ],
      },
      null,
      2,
    ),
  );
} catch (error) {
  android.capture("mobile-photo-ui-failure.png", true);
  throw error;
} finally {
  if (ticketId) {
    const rows = await db.query(
      'SELECT "storageKey" FROM "TicketPhoto" WHERE "ticketId"=$1',
      [ticketId],
    );
    await db.query('DELETE FROM "Ticket" WHERE "id"=$1 AND "requestId"=$2', [
      ticketId,
      requestId,
    ]);
    for (const { storageKey } of rows.rows)
      await fs.unlink(
        path.join(local.root, ".local/uploads/ticket-photos", storageKey),
      );
  }
  for (const value of [token, ...gateway.sessions].filter(Boolean))
    await nativeRequest("/mobile/auth/logout", {
      method: "POST",
      token: value,
    }).catch(() => {});
  await local.dispose();
  await db.end();
  android.run(["reverse", "tcp:3001", "tcp:3001"]);
  await gateway.close();
  android.run(["shell", "rm", "-f", remote]);
  await fs.unlink(fixture).catch(() => {});
}

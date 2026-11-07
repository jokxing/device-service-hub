import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { photoRequest, uploadPhoto } from "./lib/photo-api.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  tokens = [],
  tickets = [];
const directory = path.join(local.root, ".local/uploads/ticket-photos");
const before = new Set(await fs.readdir(directory).catch(() => []));
async function login(username) {
  const r = await nativeRequest("/mobile/auth/login", {
    method: "POST",
    body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
  });
  assert.equal(r.status, 200);
  tokens.push(r.value.accessToken);
  return r.value.accessToken;
}
async function create(token) {
  const r = await nativeRequest("/mobile/tickets", {
    token,
    method: "POST",
    body: {
      requestId: randomUUID(),
      deviceId: "device-ac001",
      title: "照片接口验收",
      description: "仅本轮随机记录",
      priority: "normal",
    },
  });
  assert.equal(r.status, 201);
  tickets.push(r.value.id);
  return r.value.id;
}
const base = (id) => `/mobile/tickets/${id}/photos`;
try {
  await local.waitForApi();
  const a = await login("reporter.a"),
    b = await login("reporter.b"),
    admin = await login("admin"),
    tech = await login("technician");
  const id = await create(a),
    pid = randomUUID();
  const image = await sharp({
    create: { width: 320, height: 240, channels: 3, background: "#2764e7" },
  })
    .png()
    .withMetadata()
    .toBuffer();
  assert.equal((await uploadPhoto(undefined, id, pid, image)).status, 401);
  assert.equal((await uploadPhoto(b, id, pid, image)).status, 404);
  assert.equal((await uploadPhoto(admin, id, pid, image)).status, 403);
  for (const headers of [
    { Origin: "http://127.0.0.1:5173" },
    { Cookie: "invalid=1" },
    { "Sec-Fetch-Mode": "cors" },
  ])
    assert.equal(
      (await uploadPhoto(a, id, pid, image, "image/png", headers)).status,
      403,
    );
  assert.equal(
    (await uploadPhoto(a, id, pid, Buffer.from("fake png"))).status,
    400,
  );
  assert.equal(
    (await uploadPhoto(a, id, pid, image, "image/jpeg")).status,
    400,
  );
  assert.equal(
    (await uploadPhoto(a, id, pid, Buffer.alloc(5 * 1024 * 1024 + 1))).status,
    413,
  );
  const huge = await sharp({
    create: { width: 5000, height: 5000, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  assert.equal((await uploadPhoto(a, id, pid, huge)).status, 400);
  const repeats = await Promise.all(
    Array.from({ length: 8 }, () => uploadPhoto(a, id, pid, image)),
  );
  assert.ok(
    repeats.every((r) => r.status === 201),
    JSON.stringify(repeats.map((r) => r.value)),
  );
  const list = await photoRequest(base(id), { token: a });
  assert.equal(list.value.length, 1);
  assert.deepEqual(Object.keys(list.value[0]).sort(), [
    "bytes",
    "createdAt",
    "height",
    "id",
    "width",
  ]);
  const content = await photoRequest(base(id) + "/" + pid, { token: a });
  assert.equal(content.status, 200);
  assert.equal(content.headers["cache-control"], "no-store");
  assert.equal(content.headers["content-type"], "image/webp");
  const metadata = await sharp(content.buffer).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.exif, undefined);
  assert.equal(
    (await photoRequest(base(id) + "/" + pid, { token: b })).status,
    404,
  );
  assert.equal((await photoRequest(base(id), { token: tech })).status, 404);
  assert.equal((await photoRequest(base(id), { token: admin })).status, 200);
  assert.equal(
    (
      await uploadPhoto(
        a,
        id,
        pid,
        await sharp(image).negate().png().toBuffer(),
      )
    ).status,
    409,
  );
  const competing = await Promise.all(
    Array.from({ length: 5 }, () => uploadPhoto(a, id, randomUUID(), image)),
  );
  assert.equal(competing.filter((r) => r.status === 201).length, 2);
  assert.equal(competing.filter((r) => r.status === 409).length, 3);
  const cookie = await local.login("admin");
  const assign = await local.request(`/admin/tickets/${id}/assign`, {
    cookie,
    method: "POST",
    body: {
      requestId: randomUUID(),
      expectedVersion: 0,
      assigneeId: "user-technician",
    },
  });
  assert.equal(assign.response.status, 201);
  assert.equal(
    (await photoRequest(base(id) + "/" + pid, { token: tech })).status,
    200,
  );
  assert.equal((await uploadPhoto(a, id, randomUUID(), image)).status, 409);
  assert.equal(
    (await uploadPhoto(a, id, pid, image)).status,
    201,
    "Same intent may replay after assignment without appending",
  );
  await db.query('UPDATE "Ticket" SET "assigneeId"=NULL WHERE "id"=$1', [id]);
  assert.equal(
    (await photoRequest(base(id) + "/" + pid, { token: tech })).status,
    404,
  );
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "Real multipart upload and protected WebP content; EXIF removed",
          "Fake MIME, corrupt image, file/pixel limits and browser transport rejected",
          "Eight-way replay stores one photo; concurrent capacity stays at three",
          "Owner, admin and current assignee scope; revoked assignee denied",
          "Assigned ticket forbids additions; same successful intent replays",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  const rows = await db.query(
    'SELECT "storageKey" FROM "TicketPhoto" WHERE "ticketId"=ANY($1::text[])',
    [tickets],
  );
  await db.query('DELETE FROM "Ticket" WHERE "id"=ANY($1::text[])', [tickets]);
  for (const { storageKey } of rows.rows)
    await fs.unlink(path.join(directory, storageKey));
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await local.dispose();
  await db.end();
  const after = await fs.readdir(directory).catch(() => []);
  assert.deepEqual(
    new Set(after),
    before,
    "No orphan files from failed/replayed uploads",
  );
}

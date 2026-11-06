import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";

const { root, request, login, logout, dispose, connectDatabase } =
  openLocalApi();
const statePath = path.join(root, ".local", "ticket-restart-verification.json");
const database = await connectDatabase();
const requestIds = [];
const checks = [];
let keepCookie;
let keepRequestId;
const input = (deviceId = "device-ac001", title = "文字报修 API 验证") => {
  const requestId = randomUUID();
  requestIds.push(requestId);
  return {
    requestId,
    deviceId,
    title,
    description: "自动验收临时记录：运行中异常，请安排检查。",
    priority: "normal",
  };
};
const post = (cookie, body) =>
  request("/tickets", { method: "POST", cookie, body });
async function clean(ids) {
  if (ids.length)
    await database.query(
      'DELETE FROM "Ticket" WHERE "requestId" = ANY($1::uuid[]) AND "reporterId" IN ($2, $3)',
      [ids, "user-reporter-a", "user-reporter-b"],
    );
}
try {
  if (process.argv.includes("--after-restart")) {
    const saved = JSON.parse(await fs.readFile(statePath, "utf8"));
    const detail = await request("/tickets/" + saved.ticketId, {
      cookie: saved.cookie,
    });
    assert.equal(detail.response.status, 200);
    assert.equal(detail.value.title, saved.title);
    assert.equal(detail.value.status, "pending");
    const replay = await post(saved.cookie, saved.input);
    assert.equal(replay.response.status, 200);
    assert.equal(replay.value.id, saved.ticketId);
    await clean([saved.input.requestId]);
    await logout(saved.cookie);
    await fs.unlink(statePath);
    checks.push("重启前的报修、会话和防重记录仍可读取；重放没有新增工单");
  } else {
    // Re-running the verifier must not orphan a previous temporary persistence record.
    const previous = await fs
      .readFile(statePath, "utf8")
      .then(JSON.parse)
      .catch((error) => {
        if (error.code === "ENOENT") return null;
        throw error;
      });
    if (previous) {
      await clean([previous.input.requestId]);
      await logout(previous.cookie);
      await fs.unlink(statePath);
    }
    assert.equal((await post(undefined, input())).response.status, 401);
    assert.equal((await request("/tickets/mine")).response.status, 401);
    const a = await login("reporter.a"),
      b = await login("reporter.b");
    const admin = await login("admin"),
      technician = await login("technician");
    const baselineA = (await request("/tickets/mine", { cookie: a })).value
      .total;
    const baselineB = (await request("/tickets/mine", { cookie: b })).value
      .total;
    for (const cookie of [admin, technician]) {
      assert.equal((await post(cookie, input())).response.status, 403);
      assert.equal(
        (await request("/tickets/mine", { cookie })).response.status,
        403,
      );
    }
    checks.push("未登录和非报修角色不能创建或访问本人报修入口");

    const normal = input(undefined, "  空调文字报修验收  ");
    const created = await post(a, normal);
    assert.equal(created.response.status, 201);
    assert.equal(created.value.title, normal.title.trim());
    assert.equal(created.value.status, "pending");
    for (const key of ["reporterId", "requestId", "requestHash", "number"])
      assert.equal(key in created.value, false);
    const replay = await post(a, { ...normal, title: normal.title.trim() });
    assert.equal(replay.response.status, 200);
    assert.equal(replay.value.id, created.value.id);
    assert.equal(
      (await post(a, { ...normal, title: "改变内容" })).response.status,
      409,
    );
    checks.push("文字归一化、初始待分派状态、顺序重放及不同内容冲突正确");

    const concurrentInput = input(undefined, "并发相同内容");
    const concurrent = await Promise.all(
      Array.from({ length: 8 }, () => post(a, concurrentInput)),
    );
    assert.equal(
      concurrent.filter((result) => result.response.status === 201).length,
      1,
    );
    assert.equal(
      concurrent.filter((result) => result.response.status === 200).length,
      7,
    );
    assert.equal(new Set(concurrent.map((result) => result.value.id)).size, 1);
    const mixedInput = input(undefined, "并发不同内容甲");
    const mixed = await Promise.all([
      post(a, mixedInput),
      post(a, { ...mixedInput, title: "并发不同内容乙" }),
    ]);
    assert.deepEqual(
      mixed.map((result) => result.response.status).sort(),
      [201, 409],
    );
    const concurrentCount = await database.query(
      'SELECT COUNT(*)::int AS count FROM "Ticket" WHERE "reporterId"=$1 AND "requestId"=$2',
      ["user-reporter-a", concurrentInput.requestId],
    );
    assert.equal(concurrentCount.rows[0].count, 1);
    checks.push("八路并发只创建一单；同编号不同内容的竞争返回冲突");

    const foreignDevice = input("device-wp002"),
      missingDevice = input("unknown-device");
    const foreign = await post(a, foreignDevice),
      missing = await post(a, missingDevice);
    assert.equal(foreign.response.status, 404);
    assert.equal(missing.response.status, 404);
    assert.equal(foreign.value.message, missing.value.message);
    for (const patch of [
      { title: "   " },
      { title: "x".repeat(61) },
      { description: "x".repeat(501) },
      { priority: "unsupported" },
      { requestId: "not-a-uuid" },
      { reporterId: "user-reporter-b" },
      { status: "completed" },
    ]) {
      assert.equal(
        (await post(a, { ...input(), ...patch })).response.status,
        400,
      );
    }
    const enabled = await database.query(
      'SELECT enabled FROM "Device" WHERE id=$1',
      ["device-ac001"],
    );
    try {
      await database.query('UPDATE "Device" SET enabled=false WHERE id=$1', [
        "device-ac001",
      ]);
      assert.equal((await post(a, input())).response.status, 409);
      assert.equal(
        (await post(a, normal)).response.status,
        200,
        "Previously committed request remains replayable",
      );
    } finally {
      await database.query('UPDATE "Device" SET enabled=$1 WHERE id=$2', [
        enabled.rows[0].enabled,
        "device-ac001",
      ]);
    }
    const grant = await database.query(
      'SELECT * FROM "DeviceAccess" WHERE "userId"=$1 AND "deviceId"=$2',
      ["user-reporter-a", "device-ac001"],
    );
    try {
      await database.query(
        'DELETE FROM "DeviceAccess" WHERE "userId"=$1 AND "deviceId"=$2',
        ["user-reporter-a", "device-ac001"],
      );
      assert.equal((await post(a, input())).response.status, 404);
      assert.equal(
        (await request("/tickets/" + created.value.id, { cookie: a })).response
          .status,
        200,
        "Own repair history survives device access revocation",
      );
    } finally {
      if (grant.rows.length)
        await database.query(
          'INSERT INTO "DeviceAccess" ("userId","deviceId") VALUES ($1,$2) ON CONFLICT DO NOTHING',
          ["user-reporter-a", "device-ac001"],
        );
    }
    checks.push("未授权、停用、撤权和无效参数不能新增报修；账号与状态不能伪造");

    const ownB = await post(b, { ...normal, deviceId: "device-wp002" });
    assert.equal(
      ownB.response.status,
      201,
      "Request IDs are scoped per authenticated user",
    );
    assert.notEqual(ownB.value.id, created.value.id);
    const listA = await request("/tickets/mine?page=1&pageSize=1", {
      cookie: a,
    });
    assert.equal(listA.value.page, 1);
    assert.equal(listA.value.pageSize, 1);
    assert.equal(listA.value.items.length, 1);
    assert.equal(listA.value.total, baselineA + 3);
    const listB = await request("/tickets/mine", { cookie: b });
    assert.equal(listB.value.total, baselineB + 1);
    const denied = await request("/tickets/" + created.value.id, { cookie: b });
    const unknown = await request("/tickets/" + randomUUID(), { cookie: b });
    assert.equal(denied.response.status, 404);
    assert.equal(unknown.response.status, 404);
    assert.equal(denied.value.message, unknown.value.message);
    for (const query of [
      "page=0",
      "pageSize=51",
      "page=1&reporterId=user-reporter-b",
    ])
      assert.equal(
        (await request("/tickets/mine?" + query, { cookie: a })).response
          .status,
        400,
      );
    checks.push("分页仅统计本人记录，跨用户详情不可见，提交编号按用户隔离");

    const persistenceInput = input(undefined, "重启持久化验证（临时）");
    const persistence = await post(a, persistenceInput);
    assert.equal(persistence.response.status, 201);
    await fs.writeFile(
      statePath,
      JSON.stringify({
        cookie: a,
        input: persistenceInput,
        ticketId: persistence.value.id,
        title: persistence.value.title,
      }),
      { mode: 0o600 },
    );
    keepCookie = a;
    keepRequestId = persistenceInput.requestId;
  }
  console.log(JSON.stringify({ result: "passed", checks }, null, 2));
} finally {
  await clean(requestIds.filter((id) => id !== keepRequestId));
  await dispose(keepCookie);
  await database.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const tag = randomUUID().replaceAll("-", "").slice(0, 24);
const users = ["task.a." + tag, "task.b." + tag];
const requestIds = [];
const request = local.request;
const check = (result, status) => {
  assert.equal(result.response.status, status, JSON.stringify(result.value));
  return result.value;
};
const command = (expectedVersion = 1) => ({
  requestId: randomUUID(),
  expectedVersion,
});
const accept = (cookie, id, body = command()) =>
  request(`/tasks/${id}/accept`, { cookie, method: "POST", body });
let admin, reporter;
async function create(assigneeId) {
  const requestId = randomUUID();
  requestIds.push(requestId);
  const ticket = check(
    await request("/tickets", {
      cookie: reporter,
      method: "POST",
      body: {
        requestId,
        deviceId: "device-ac001",
        title: "维修任务 API 验收 " + tag,
        description: "仅本轮随机验收记录，完成后定向清理。",
        priority: "normal",
      },
    }),
    201,
  );
  if (assigneeId)
    check(
      await request(`/admin/tickets/${ticket.id}/assign`, {
        cookie: admin,
        method: "POST",
        body: { ...command(0), assigneeId },
      }),
      201,
    );
  return ticket;
}
async function audit(id) {
  const result = await db.query(
    'SELECT t."status",t."version",COUNT(a."id")::int AS count FROM "Ticket" t LEFT JOIN "TicketAcceptance" a ON a."ticketId"=t."id" WHERE t."id"=$1 GROUP BY t."id"',
    [id],
  );
  return result.rows[0];
}
try {
  for (const [index, id] of users.entries())
    await db.query(
      'INSERT INTO "User" ("id","username","name","role","passwordHash","active") SELECT $1,$1,$2,\'technician\',"passwordHash",true FROM "User" WHERE "id"=$3',
      [id, `任务验收维修员${index + 1}`, "user-technician"],
    );
  admin = await local.login("admin");
  reporter = await local.login("reporter.a");
  const reporterB = await local.login("reporter.b");
  const a = await local.login(users[0]);
  const b = await local.login(users[1]);
  const ticket = await create(users[0]);
  const second = await create(users[0]);
  const other = await create(users[1]);
  const pending = await create();

  for (const cookie of [undefined, admin, reporter]) {
    const status = cookie ? 403 : 401;
    check(await request("/tasks", { cookie }), status);
    check(await request("/tasks/" + ticket.id, { cookie }), status);
    check(await accept(cookie, ticket.id), status);
  }
  const list = check(await request("/tasks", { cookie: a }), 200);
  assert.equal(list.total, 2);
  assert.deepEqual(
    new Set(list.items.map((row) => row.id)),
    new Set([ticket.id, second.id]),
  );
  for (const row of list.items) {
    assert.equal(row.assignee.id, users[0]);
    for (const key of [
      "reporter",
      "reporterId",
      "assignment",
      "requestHash",
      "requestId",
      "number",
    ])
      assert.equal(key in row, false);
  }
  const page2 = check(
    await request("/tasks?page=2&pageSize=1&status=assigned", { cookie: a }),
    200,
  );
  assert.equal(page2.total, 2);
  assert.equal(page2.items.length, 1);
  const firstPage = check(
    await request("/tasks?page=1&pageSize=1&status=assigned", { cookie: a }),
    200,
  );
  assert.notEqual(firstPage.items[0].id, page2.items[0].id);
  assert.equal(
    check(await request("/tasks?status=processing", { cookie: a }), 200).total,
    0,
  );
  for (const query of [
    "status=unknown",
    "page=0",
    "page=1.5",
    "pageSize=51",
    "assigneeId=forged",
  ])
    check(await request("/tasks?" + query, { cookie: a }), 400);
  for (const id of [other.id, pending.id, randomUUID()]) {
    check(await request("/tasks/" + id, { cookie: a }), 404);
    check(await accept(a, id), 404);
  }
  check(await request("/tasks/invalid", { cookie: a }), 400);
  for (const patch of [
    { requestId: "bad" },
    { expectedVersion: -1 },
    { expectedVersion: "1" },
    { actorId: "forged" },
    { assigneeId: users[1] },
    { status: "processing" },
  ])
    check(await accept(a, ticket.id, { ...command(), ...patch }), 400);
  check(await accept(a, ticket.id, command(0)), 409);
  assert.deepEqual(await audit(ticket.id), {
    status: "assigned",
    version: 1,
    count: 0,
  });

  const intent = command();
  const results = await Promise.all(
    Array.from({ length: 8 }, () => accept(a, ticket.id, intent)),
  );
  for (const result of results) {
    const record = check(result, 201);
    assert.equal(record.status, "processing");
    assert.equal(record.version, 2);
    assert.equal(record.acceptance.actor.id, users[0]);
    assert.ok(Number.isFinite(Date.parse(record.acceptance.createdAt)));
  }
  assert.deepEqual(await audit(ticket.id), {
    status: "processing",
    version: 2,
    count: 1,
  });
  check(await accept(a, ticket.id, intent), 201);
  check(await accept(a, ticket.id, { ...intent, expectedVersion: 2 }), 409);
  check(await accept(a, second.id, intent), 409);
  check(await accept(a, ticket.id), 409);
  check(await accept(b, ticket.id, intent), 404);
  assert.deepEqual(await audit(second.id), {
    status: "assigned",
    version: 1,
    count: 0,
  });

  const races = await Promise.all([accept(a, second.id), accept(a, second.id)]);
  assert.deepEqual(
    races.map((result) => result.response.status).sort(),
    [201, 409],
  );
  assert.deepEqual(await audit(second.id), {
    status: "processing",
    version: 2,
    count: 1,
  });
  const own = check(
    await request("/tickets/" + ticket.id, { cookie: reporter }),
    200,
  );
  assert.equal(own.status, "processing");
  assert.equal(own.acceptance.actor.id, users[0]);
  assert.equal("version" in own, false);
  check(await request("/tickets/" + ticket.id, { cookie: reporterB }), 404);
  const managed = check(
    await request("/admin/tickets/" + ticket.id, { cookie: admin }),
    200,
  );
  assert.equal(managed.acceptance.actor.id, users[0]);
  assert.equal(managed.assignment.actor.id, "user-admin");

  // Ownership changes are simulated only on this run's temporary ticket.
  await db.query(
    'UPDATE "Ticket" SET "assigneeId"=$2,"version"="version"+1 WHERE "id"=$1',
    [ticket.id, users[1]],
  );
  check(await accept(a, ticket.id, intent), 404);
  check(await request("/tasks/" + ticket.id, { cookie: a }), 404);
  assert.equal(check(await request("/tasks", { cookie: a }), 200).total, 1);

  for (const status of [
    "pending",
    "processing",
    "confirming",
    "completed",
    "cancelled",
  ]) {
    await db.query(
      'UPDATE "Ticket" SET "status"=$2::"TicketStatus" WHERE "id"=$1',
      [other.id, status],
    );
    check(await accept(b, other.id), 409);
    assert.equal((await audit(other.id)).count, 0);
  }
  await db.query('UPDATE "User" SET "active"=false WHERE "id"=$1', [users[0]]);
  check(await request("/tasks", { cookie: a }), 401);
  check(await accept(a, second.id), 401);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "任务列表、总数、筛选与分页均限定本人",
          "匿名、非维修角色、跨维修人员与未知工单拦截",
          "参数白名单、过期版本与非法状态拒绝",
          "同意图八路并发仅一条接单记录",
          "不同意图竞争仅一方成功",
          "接单状态、版本、操作人与时间原子写入",
          "报修用户与管理员可见进度且不扩大数据范围",
          "归属变化后旧意图不能绕过当前权限",
          "停用维修账号不能继续访问或接单",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  if (requestIds.length)
    await db.query(
      'DELETE FROM "Ticket" WHERE "requestId"=ANY($1::uuid[]) AND "reporterId"=$2',
      [requestIds, "user-reporter-a"],
    );
  await local.dispose();
  await db.query('DELETE FROM "User" WHERE "id"=ANY($1::text[])', [users]);
  await db.end();
}

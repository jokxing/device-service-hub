import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "result.api");
const check = (result, status) => {
  assert.equal(result.response.status, status, JSON.stringify(result.value));
  return result.value;
};
const command = (
  description = "已清理滤网并检查制冷回路。\n试运行正常。",
  expectedVersion = 2,
) => ({ requestId: randomUUID(), description, expectedVersion });
const submit = (cookie, id, body = command()) =>
  local.request(`/tasks/${id}/result`, { cookie, method: "POST", body });
async function audit(id) {
  const result = await db.query(
    'SELECT t."status",t."version",COUNT(r."id")::int AS count FROM "Ticket" t LEFT JOIN "TicketResult" r ON r."ticketId"=t."id" WHERE t."id"=$1 GROUP BY t."id"',
    [id],
  );
  return result.rows[0];
}
try {
  await local.waitForApi();
  const a = await fixtures.technician("结果验收维修员甲");
  const b = await fixtures.technician("结果验收维修员乙");
  const { admin, reporter } = await fixtures.identities();
  const reporterB = await local.login("reporter.b");
  const task = await fixtures.task(a),
    second = await fixtures.task(a),
    other = await fixtures.task(b);
  const pending = await fixtures.task(a, { stage: "pending" });
  const assigned = await fixtures.task(a, { stage: "assigned" });
  for (const cookie of [undefined, admin, reporter])
    check(await submit(cookie, task.id), cookie ? 403 : 401);
  for (const id of [other.id, pending.id, randomUUID()])
    check(await submit(a.cookie, id), 404);
  check(await submit(a.cookie, "invalid"), 400);
  check(await submit(a.cookie, assigned.id, command(undefined, 1)), 409);
  for (const description of [
    undefined,
    null,
    1,
    {},
    [],
    "",
    " \n\t ",
    "x".repeat(2001),
  ]) {
    const body = command();
    body.description = description;
    check(await submit(a.cookie, task.id, body), 400);
  }
  for (const patch of [
    { requestId: "bad" },
    { expectedVersion: -1 },
    { expectedVersion: "2" },
    { actorId: "forged" },
    { status: "confirming" },
    { attachments: [] },
  ])
    check(await submit(a.cookie, task.id, { ...command(), ...patch }), 400);
  check(await submit(a.cookie, task.id, command(undefined, 1)), 409);
  assert.deepEqual(await audit(task.id), {
    status: "processing",
    version: 2,
    count: 0,
  });

  const intent = command("  已清理滤网。\n试运行正常。  ");
  const results = await Promise.all(
    Array.from({ length: 8 }, () => submit(a.cookie, task.id, intent)),
  );
  const record = check(results[0], 201);
  for (const result of results) {
    const value = check(result, 201);
    assert.equal(value.status, "confirming");
    assert.equal(value.version, 3);
    assert.equal(value.result.description, intent.description.trim());
    assert.equal(value.result.actor.id, a.id);
    assert.equal(value.result.createdAt, record.result.createdAt);
    assert.equal(value.acceptance.actor.id, a.id);
    assert.deepEqual(Object.keys(value.result).sort(), [
      "actor",
      "createdAt",
      "description",
    ]);
  }
  assert.ok(Number.isFinite(Date.parse(record.result.createdAt)));
  assert.deepEqual(await audit(task.id), {
    status: "confirming",
    version: 3,
    count: 1,
  });
  check(
    await submit(a.cookie, task.id, {
      ...intent,
      description: intent.description.trim(),
    }),
    201,
  );
  check(
    await submit(a.cookie, task.id, { ...intent, description: "改变说明" }),
    409,
  );
  check(
    await submit(a.cookie, task.id, { ...intent, expectedVersion: 3 }),
    409,
  );
  check(await submit(a.cookie, second.id, intent), 409);
  check(await submit(a.cookie, task.id), 409);
  check(await submit(b.cookie, task.id, intent), 404);
  assert.deepEqual(await audit(second.id), {
    status: "processing",
    version: 2,
    count: 0,
  });

  const competing = await Promise.all([
    submit(a.cookie, second.id, command("结果甲")),
    submit(a.cookie, second.id, command("结果乙")),
  ]);
  assert.deepEqual(
    competing.map((item) => item.response.status).sort(),
    [201, 409],
  );
  assert.deepEqual(await audit(second.id), {
    status: "confirming",
    version: 3,
    count: 1,
  });
  const boundary = await fixtures.task(a);
  check(await submit(a.cookie, boundary.id, command("长".repeat(2000))), 201);
  const own = check(
    await local.request("/tickets/" + task.id, { cookie: reporter }),
    200,
  );
  assert.equal(own.result.description, record.result.description);
  assert.equal(own.result.createdAt, record.result.createdAt);
  assert.equal("version" in own, false);
  check(await local.request("/tickets/" + task.id, { cookie: reporterB }), 404);
  const managed = check(
    await local.request("/admin/tickets/" + task.id, { cookie: admin }),
    200,
  );
  assert.deepEqual(managed.result, own.result);
  const page = check(
    await local.request("/tasks?status=confirming", { cookie: a.cookie }),
    200,
  );
  assert.ok(page.items.some((item) => item.id === task.id));

  const inconsistent = await fixtures.task(a);
  for (const status of [
    "pending",
    "assigned",
    "confirming",
    "completed",
    "cancelled",
  ]) {
    await db.query(
      'UPDATE "Ticket" SET "status"=$2::"TicketStatus" WHERE "id"=$1',
      [inconsistent.id, status],
    );
    check(await submit(a.cookie, inconsistent.id), 409);
    assert.equal((await audit(inconsistent.id)).count, 0);
  }
  // Verify rollback when an existing immutable result conflicts with a new write.
  await db.query('UPDATE "Ticket" SET "status"=\'processing\' WHERE "id"=$1', [
    task.id,
  ]);
  check(await submit(a.cookie, task.id, command("不能覆盖已存在结果", 3)), 409);
  assert.deepEqual(await audit(task.id), {
    status: "processing",
    version: 3,
    count: 1,
  });
  await db.query(
    'UPDATE "Ticket" SET "assigneeId"=$2,"version"="version"+1 WHERE "id"=$1',
    [task.id, b.id],
  );
  check(await submit(a.cookie, task.id, intent), 404);
  await db.query('UPDATE "User" SET "active"=false WHERE "id"=$1', [a.id]);
  check(await submit(a.cookie, second.id), 401);
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "身份、当前归属与非法状态拦截",
          "处理说明去空白、长度边界与参数白名单",
          "过期版本不写入任何结果",
          "八路同意图仅一条结果且版本仅增加一次",
          "不同内容和不同意图竞争不覆盖胜出结果",
          "结果唯一冲突时状态更新回滚",
          "报修人与管理员可查看一致的结果、人员和时间",
          "跨用户、归属变化及账号停用不能绕过权限",
        ],
      },
      null,
      2,
    ),
  );
} finally {
  await fixtures.cleanup();
  await db.end();
}

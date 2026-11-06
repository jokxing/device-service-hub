import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const fixtures = taskFixtures(local, db, "confirm.api");
const command = (expectedVersion = 3) => ({
  requestId: randomUUID(),
  expectedVersion,
});
const check = (result, status) => {
  assert.equal(result.response.status, status, JSON.stringify(result.value));
  return result.value;
};
const confirm = (cookie, id, body = command()) =>
  local.request(`/tickets/${id}/confirm`, { cookie, method: "POST", body });
async function audit(id) {
  const result = await db.query(
    'SELECT t."status",t."version",COUNT(c."id")::int AS count FROM "Ticket" t LEFT JOIN "TicketConfirmation" c ON c."ticketId"=t."id" WHERE t."id"=$1 GROUP BY t."id"',
    [id],
  );
  return result.rows[0];
}
try {
  await local.waitForApi();
  const tech = await fixtures.technician("确认验收维修员");
  const { admin, reporter } = await fixtures.identities();
  const other = await local.login("reporter.b");
  const ticket = await fixtures.task(tech, { stage: "confirming" });
  const second = await fixtures.task(tech, { stage: "confirming" });
  for (const cookie of [undefined, admin, tech.cookie])
    check(await confirm(cookie, ticket.id), cookie ? 403 : 401);
  check(await confirm(other, ticket.id), 404);
  check(await confirm(reporter, randomUUID()), 404);
  check(await confirm(reporter, "invalid"), 400);
  for (const patch of [
    { requestId: "bad" },
    { expectedVersion: -1 },
    { expectedVersion: "3" },
    { expectedVersion: 1.5 },
    { actorId: "forged" },
    { confirmedAt: new Date().toISOString() },
    { status: "completed" },
    { result: "forged" },
  ])
    check(await confirm(reporter, ticket.id, { ...command(), ...patch }), 400);
  check(await confirm(reporter, ticket.id, command(2)), 409);
  assert.deepEqual(await audit(ticket.id), {
    status: "confirming",
    version: 3,
    count: 0,
  });
  const own = check(
    await local.request("/tickets/" + ticket.id, { cookie: reporter }),
    200,
  );
  assert.equal(own.version, 3);
  const list = check(
    await local.request("/tickets/mine?page=1&pageSize=50", {
      cookie: reporter,
    }),
    200,
  );
  assert.ok(list.items.some((row) => row.id === ticket.id));
  assert.ok(list.items.every((row) => !("version" in row)));

  const intent = command();
  const results = await Promise.all(
    Array.from({ length: 8 }, () => confirm(reporter, ticket.id, intent)),
  );
  const saved = check(results[0], 201);
  for (const result of results) {
    const value = check(result, 201);
    assert.equal(value.status, "completed");
    assert.equal(value.version, 4);
    assert.equal(value.confirmation.actor.id, "user-reporter-a");
    assert.equal(value.confirmation.createdAt, saved.confirmation.createdAt);
    assert.deepEqual(value.result, own.result);
    assert.deepEqual(Object.keys(value.confirmation).sort(), [
      "actor",
      "createdAt",
    ]);
    for (const key of [
      "requestId",
      "reporterId",
      "number",
      "assignment",
      "requestHash",
    ])
      assert.equal(key in value, false);
  }
  assert.ok(Number.isFinite(Date.parse(saved.confirmation.createdAt)));
  assert.deepEqual(await audit(ticket.id), {
    status: "completed",
    version: 4,
    count: 1,
  });
  check(await confirm(reporter, ticket.id, intent), 201);
  check(
    await confirm(reporter, ticket.id, { ...intent, expectedVersion: 4 }),
    409,
  );
  check(await confirm(reporter, second.id, intent), 409);
  check(await confirm(other, ticket.id, intent), 404);
  check(await confirm(reporter, ticket.id, command(4)), 409);
  assert.deepEqual(await audit(second.id), {
    status: "confirming",
    version: 3,
    count: 0,
  });

  const races = await Promise.all([
    confirm(reporter, second.id),
    confirm(reporter, second.id),
  ]);
  assert.deepEqual(
    races.map((result) => result.response.status).sort(),
    [201, 409],
  );
  assert.deepEqual(await audit(second.id), {
    status: "completed",
    version: 4,
    count: 1,
  });
  const managed = check(
    await local.request("/admin/tickets/" + ticket.id, { cookie: admin }),
    200,
  );
  const task = check(
    await local.request("/tasks/" + ticket.id, { cookie: tech.cookie }),
    200,
  );
  assert.deepEqual(managed.confirmation, saved.confirmation);
  assert.deepEqual(task.confirmation, saved.confirmation);
  assert.equal(managed.status, "completed");
  assert.equal(task.status, "completed");

  check(
    await local.request(`/admin/tickets/${ticket.id}/assign`, {
      cookie: admin,
      method: "POST",
      body: { ...command(4), assigneeId: tech.id },
    }),
    409,
  );
  check(
    await local.request(`/tasks/${ticket.id}/accept`, {
      cookie: tech.cookie,
      method: "POST",
      body: command(4),
    }),
    409,
  );
  check(
    await local.request(`/tasks/${ticket.id}/result`, {
      cookie: tech.cookie,
      method: "POST",
      body: { ...command(4), description: "不能覆盖完成记录" },
    }),
    409,
  );
  assert.deepEqual(await audit(ticket.id), {
    status: "completed",
    version: 4,
    count: 1,
  });

  for (const stage of ["pending", "assigned", "processing"]) {
    const invalid = await fixtures.task(tech, { stage });
    check(
      await confirm(reporter, invalid.id, command(invalid.version ?? 0)),
      409,
    );
    assert.equal((await audit(invalid.id)).count, 0);
  }
  const inconsistent = await fixtures.task(tech);
  await db.query(
    'UPDATE "Ticket" SET "status"=\'confirming\',"version"=3 WHERE "id"=$1',
    [inconsistent.id],
  );
  check(await confirm(reporter, inconsistent.id), 409);
  assert.deepEqual(await audit(inconsistent.id), {
    status: "confirming",
    version: 3,
    count: 0,
  });
  const invalidStates = await fixtures.task(tech, { stage: "confirming" });
  for (const status of ["cancelled", "completed"]) {
    await db.query(
      'UPDATE "Ticket" SET "status"=$2::"TicketStatus" WHERE "id"=$1',
      [invalidStates.id, status],
    );
    check(await confirm(reporter, invalidStates.id), 409);
    assert.equal((await audit(invalidStates.id)).count, 0);
  }
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "仅报修人本人确认，管理员和维修人员不可代确认",
          "本人详情提供版本而列表契约保持不变",
          "请求白名单、过期版本及缺失处理结果拦截",
          "八路同意图仅一次状态更新和确认记录",
          "不同意图竞争只有一方成功",
          "三角色确认人和时间一致，处理结果保持原样",
          "完成后原有修改命令均不能重开工单",
          "未知、跨用户和非法状态不产生确认记录",
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

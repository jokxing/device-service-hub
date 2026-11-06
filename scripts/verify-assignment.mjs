import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";

const local = openLocalApi();
const db = await local.connectDatabase();
const tag = randomUUID().replaceAll("-", "").slice(0, 24);
const requestIds = [];
const fixtureUsers = [
  "assign.techa." + tag,
  "assign.techb." + tag,
  "assign.admin." + tag,
];
const request = local.request;
const assignment = (assigneeId = fixtureUsers[0], expectedVersion = 0) => ({
  requestId: randomUUID(),
  assigneeId,
  expectedVersion,
});
const assign = (cookie, id, body) =>
  request(`/admin/tickets/${id}/assign`, { cookie, method: "POST", body });
const check = (result, status) => {
  assert.equal(result.response.status, status, JSON.stringify(result.value));
  return result.value;
};
async function create(cookie) {
  const requestId = randomUUID();
  requestIds.push(requestId);
  return check(
    await request("/tickets", {
      cookie,
      method: "POST",
      body: {
        requestId,
        deviceId: "device-ac001",
        title: "分派 API 临时验收 " + tag,
        description: "仅本轮临时记录，测试后按随机提交编号清理。",
        priority: "normal",
      },
    }),
    201,
  );
}
async function audit(id) {
  const result = await db.query(
    'SELECT t."status", t."version", t."assigneeId", COUNT(a."id")::int AS count FROM "Ticket" t LEFT JOIN "TicketAssignment" a ON a."ticketId"=t."id" WHERE t."id"=$1 GROUP BY t."id"',
    [id],
  );
  return result.rows[0];
}
try {
  for (const [index, id] of fixtureUsers.entries()) {
    await db.query(
      'INSERT INTO "User" ("id","username","name","role","passwordHash","active") SELECT $1,$1,$2,$3::"Role","passwordHash",true FROM "User" WHERE "id"=$4',
      [
        id,
        index === 2 ? "验收管理员" : `验收维修员${index + 1}`,
        index === 2 ? "admin" : "technician",
        "user-technician",
      ],
    );
  }
  const admin = await local.login("admin");
  const admin2 = await local.login(fixtureUsers[2]);
  const reporter = await local.login("reporter.a");
  const otherReporter = await local.login("reporter.b");
  const technician = await local.login("technician");
  const ticket = await create(reporter);
  for (const cookie of [undefined, reporter, technician]) {
    const status = cookie ? 403 : 401;
    check(await request("/admin/tickets", { cookie }), status);
    check(await request("/admin/tickets/technicians", { cookie }), status);
    check(await request("/admin/tickets/" + ticket.id, { cookie }), status);
    check(await assign(cookie, ticket.id, assignment()), status);
  }
  const list = check(
    await request("/admin/tickets?status=pending&page=1&pageSize=50", {
      cookie: admin,
    }),
    200,
  );
  assert.ok(list.items.some((row) => row.id === ticket.id));
  assert.ok(list.items.every((row) => row.status === "pending"));
  const secondPage = check(
    await request("/admin/tickets?page=2&pageSize=1", { cookie: admin }),
    200,
  );
  assert.equal(secondPage.page, 2);
  assert.ok(secondPage.items.length <= 1);
  for (const query of [
    "status=invalid",
    "page=0",
    "pageSize=51",
    "reporterId=forged",
  ])
    check(await request("/admin/tickets?" + query, { cookie: admin }), 400);
  const candidates = check(
    await request("/admin/tickets/technicians", { cookie: admin }),
    200,
  );
  assert.ok(candidates.some((person) => person.id === fixtureUsers[0]));
  for (const person of candidates)
    assert.deepEqual(Object.keys(person).sort(), ["id", "name"]);

  for (const assignee of ["user-admin", "user-reporter-a", "missing-person"])
    check(await assign(admin, ticket.id, assignment(assignee)), 409);
  await db.query('UPDATE "User" SET "active"=false WHERE "id"=$1', [
    fixtureUsers[1],
  ]);
  check(await assign(admin, ticket.id, assignment(fixtureUsers[1])), 409);
  assert.equal(
    check(
      await request("/admin/tickets/technicians", { cookie: admin }),
      200,
    ).some((person) => person.id === fixtureUsers[1]),
    false,
  );
  await db.query('UPDATE "User" SET "active"=true WHERE "id"=$1', [
    fixtureUsers[1],
  ]);
  check(await assign(admin, ticket.id, assignment(undefined, 1)), 409);
  check(await assign(admin, randomUUID(), assignment()), 404);
  check(await assign(admin, "invalid", assignment()), 400);
  for (const patch of [
    { requestId: "bad" },
    { expectedVersion: -1 },
    { expectedVersion: "0" },
    { assigneeId: "" },
    { actorId: "forged" },
    { status: "assigned" },
  ]) {
    check(await assign(admin, ticket.id, { ...assignment(), ...patch }), 400);
  }
  assert.deepEqual(await audit(ticket.id), {
    status: "pending",
    version: 0,
    assigneeId: null,
    count: 0,
  });

  const intent = assignment();
  const assigned = check(await assign(admin, ticket.id, intent), 201);
  assert.equal(assigned.status, "assigned");
  assert.equal(assigned.version, 1);
  assert.equal(assigned.assignee.id, fixtureUsers[0]);
  assert.equal(assigned.assignment.actor.id, "user-admin");
  assert.equal(assigned.assignment.createdAt, assigned.assignedAt);
  assert.equal(
    check(await assign(admin, ticket.id, intent), 201).id,
    ticket.id,
  );
  check(
    await assign(admin, ticket.id, { ...intent, assigneeId: fixtureUsers[1] }),
    409,
  );
  check(await assign(admin, ticket.id, { ...intent, expectedVersion: 1 }), 409);
  check(await assign(admin, ticket.id, assignment()), 409);
  const auditRow = await audit(ticket.id);
  assert.equal(auditRow.count, 1);
  assert.equal(auditRow.version, 1);
  const own = check(
    await request("/tickets/" + ticket.id, { cookie: reporter }),
    200,
  );
  assert.equal(own.status, "assigned");
  assert.equal(own.assignee.id, fixtureUsers[0]);
  for (const key of ["reporter", "assignment", "requestId", "requestHash"])
    assert.equal(key in own, false);
  assert.equal(own.version, 1);
  check(await request("/tickets/" + ticket.id, { cookie: otherReporter }), 404);

  const same = await create(reporter);
  const sameIntent = assignment();
  const concurrent = await Promise.all(
    Array.from({ length: 8 }, () => assign(admin, same.id, sameIntent)),
  );
  for (const result of concurrent) assert.equal(check(result, 201).id, same.id);
  assert.equal((await audit(same.id)).count, 1);
  assert.equal((await audit(same.id)).version, 1);

  const race = await create(reporter);
  const races = await Promise.all([
    assign(admin, race.id, assignment()),
    assign(admin2, race.id, assignment(fixtureUsers[1])),
  ]);
  assert.deepEqual(
    races.map((result) => result.response.status).sort(),
    [201, 409],
  );
  const winner = races.find((result) => result.response.status === 201).value;
  const raceAudit = await audit(race.id);
  assert.equal(raceAudit.assigneeId, winner.assignee.id);
  assert.equal(raceAudit.count, 1);
  assert.equal(raceAudit.version, 1);

  const other = await create(reporter);
  check(await assign(admin, other.id, intent), 409);
  assert.equal((await audit(other.id)).status, "pending");
  for (const status of [
    "assigned",
    "processing",
    "confirming",
    "completed",
    "cancelled",
  ]) {
    await db.query(
      'UPDATE "Ticket" SET "status"=$2::"TicketStatus" WHERE "id"=$1',
      [other.id, status],
    );
    check(await assign(admin, other.id, assignment()), 409);
    assert.equal((await audit(other.id)).count, 0);
  }
  console.log(
    JSON.stringify(
      {
        result: "passed",
        checks: [
          "管理员范围与匿名/非管理员拦截",
          "状态筛选、分页和参数校验",
          "仅可选择启用维修人员",
          "首次分派原子更新与操作人记录",
          "同意图八路重试只写一次",
          "两管理员竞争仅一方成功",
          "过期版本、重复编号与非待分派状态拒绝",
          "本人可见分派结果，跨用户仍被拦截",
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
  await db.query('DELETE FROM "User" WHERE "id"=ANY($1::text[])', [
    fixtureUsers,
  ]);
  await db.end();
}

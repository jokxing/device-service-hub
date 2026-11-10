import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "orders.query");
const check = (r, s) => {
  assert.equal(r.response.status, s, JSON.stringify(r.value));
  return r.value;
};
const cmd = (version) => ({
  requestId: randomUUID(),
  expectedVersion: version,
});
const list = (cookie, query = "") =>
  local.request("/orders" + query, { cookie });
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities(),
    reporterB = await local.login("reporter.b");
  const tech = await fixtures.technician("订单查询维修员"),
    other = await fixtures.technician("其他订单维修员"),
    empty = await fixtures.technician("无订单维修员");
  const values = [];
  for (let i = 0; i < 11; i++) values.push(await fixtures.orderedTask(tech));
  const foreign = await fixtures.orderedTask(other);
  await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
    "user-reporter-b",
    foreign.ticket.id,
  ]);
  try {
    for (const index of [1, 2, 3]) {
      const v = values[index];
      check(
        await local.request(`/orders/${v.order.id}/start`, {
          cookie: tech.cookie,
          method: "POST",
          body: cmd(4),
        }),
        201,
      );
      if (index >= 2)
        check(
          await local.request(`/tasks/${v.ticket.id}/result`, {
            cookie: tech.cookie,
            method: "POST",
            body: { ...cmd(5), description: "查询验收已修复" },
          }),
          201,
        );
      if (index === 3)
        check(
          await local.request(`/tickets/${v.ticket.id}/confirm`, {
            cookie: reporter,
            method: "POST",
            body: cmd(6),
          }),
          201,
        );
    }
    check(
      await local.request(`/orders/${values[4].order.id}/cancel`, {
        cookie: reporter,
        method: "POST",
        body: { ...cmd(4), reason: "查询验收取消记录" },
      }),
      201,
    );
    const ids = values.map((v) => v.order.id);
    await db.query(
      'UPDATE "ServiceOrder" SET "createdAt"=$1 WHERE id=ANY($2::text[])',
      [new Date().toISOString(), ids],
    );
    check(await list(undefined), 401);
    check(await local.request(`/orders/${values[0].order.id}`), 401);
    for (const q of [
      "?page=0",
      "?page=-1",
      "?page=1.5",
      "?page=100001",
      "?pageSize=0",
      "?pageSize=51",
      "?status=processing",
      "?status=bad",
      "?actorId=user-admin",
      "?reporterId=user-reporter-a",
      "?page=1&page=2",
    ])
      check(await list(reporter, q), 400);
    const first = check(await list(tech.cookie), 200),
      second = check(await list(tech.cookie, "?page=2"), 200);
    assert.equal(first.total, 11);
    assert.equal(first.pageSize, 10);
    assert.equal(first.items.length, 10);
    assert.equal(second.items.length, 1);
    assert.equal(second.total, first.total);
    const expected = (
      await db.query(
        'SELECT id FROM "ServiceOrder" WHERE id=ANY($1::text[]) ORDER BY "createdAt" DESC,id DESC',
        [ids],
      )
    ).rows.map((r) => r.id);
    assert.deepEqual(
      [...first.items, ...second.items].map((v) => v.id),
      expected,
    );
    assert.equal(new Set(expected).size, 11);
    for (const item of first.items) {
      assert.deepEqual(Object.keys(item).sort(), [
        "code",
        "createdAt",
        "currency",
        "id",
        "status",
        "ticket",
        "ticketId",
        "totalCents",
      ]);
      assert.deepEqual(Object.keys(item.ticket).sort(), [
        "code",
        "device",
        "title",
      ]);
    }
    assert.deepEqual(
      check(await list(tech.cookie, "?page=100000"), 200).items,
      [],
    );
    assert.equal(
      check(await list(tech.cookie, "?pageSize=1"), 200).items.length,
      1,
    );
    for (const [status, count] of [
      ["awaiting_start", 7],
      ["in_progress", 1],
      ["awaiting_confirmation", 1],
      ["completed", 1],
      ["cancelled", 1],
    ]) {
      const filtered = check(await list(tech.cookie, "?status=" + status), 200);
      assert.equal(filtered.total, count);
      assert.ok(filtered.items.every((o) => o.status === status));
    }
    assert.equal(check(await list(empty.cookie), 200).total, 0);
    assert.deepEqual(check(await list(empty.cookie), 200).items, []);
    const adminCount = Number(
      (await db.query('SELECT COUNT(*) FROM "ServiceOrder"')).rows[0].count,
    );
    assert.equal(check(await list(admin), 200).total, adminCount);
    const a = check(await list(reporter), 200),
      b = check(await list(reporterB), 200);
    assert.ok(!a.items.some((v) => v.id === foreign.order.id));
    assert.ok(!b.items.some((v) => ids.includes(v.id)));
    const detail = check(
      await local.request(`/orders/${values[3].order.id}`, {
        cookie: reporter,
      }),
      200,
    );
    assert.equal(detail.status, "completed");
    assert.equal(detail.ticket.status, "completed");
    assert.equal(detail.ticket.result.description, "查询验收已修复");
    assert.ok(detail.ticket.confirmation);
    assert.equal(detail.totalCents, 5998);
    assert.equal(detail.items.length, 2);
    for (const key of [
      "actorId",
      "requestId",
      "expectedVersion",
      "requestHash",
      "number",
      "version",
    ])
      assert.equal(key in detail, false);
    for (const cookie of [admin, tech.cookie])
      assert.deepEqual(
        check(await local.request(`/orders/${detail.id}`, { cookie }), 200),
        detail,
      );
    for (const cookie of [reporterB, other.cookie, empty.cookie])
      check(await local.request(`/orders/${detail.id}`, { cookie }), 404);
    check(
      await local.request(`/orders/${randomUUID()}`, { cookie: reporter }),
      404,
    );
    check(await local.request("/orders/not-a-uuid", { cookie: reporter }), 400);
    const byTicket = check(
      await local.request(`/orders/by-ticket/${values[0].ticket.id}`, {
        cookie: reporter,
      }),
      200,
    );
    assert.equal(byTicket.order.id, values[0].order.id);
    const changed = values[0];
    await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE id=$2', [
      other.id,
      changed.ticket.id,
    ]);
    try {
      check(
        await local.request(`/orders/${changed.order.id}`, {
          cookie: tech.cookie,
        }),
        404,
      );
      assert.equal(check(await list(tech.cookie), 200).total, 10);
      assert.equal(check(await list(other.cookie), 200).total, 2);
    } finally {
      await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE id=$2', [
        tech.id,
        changed.ticket.id,
      ]);
    }
    console.log(
      "Order queries API: bounded DTOs, minimal summary, stable two-page ordering/count, all state filters, owner/current-assignee/admin scopes, unknown/foreign detail isolation, immutable items/audit records and by-ticket compatibility passed.",
    );
  } finally {
    await db.query('UPDATE "Ticket" SET "reporterId"=$1 WHERE id=$2', [
      "user-reporter-a",
      foreign.ticket.id,
    ]);
  }
} finally {
  await fixtures.cleanup();
  await db.end();
}

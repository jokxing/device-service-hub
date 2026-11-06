import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

/** Only generated IDs and reporter.a request IDs are eligible for cleanup. */
export function taskFixtures(local, db, prefix) {
  const users = [],
    requestIds = [];
  let accounts;
  async function identities() {
    if (!accounts)
      accounts = {
        admin: await local.login("admin"),
        reporter: await local.login("reporter.a"),
      };
    return accounts;
  }
  async function technician(name) {
    const id = prefix + "." + randomUUID().replaceAll("-", "").slice(0, 20);
    users.push(id);
    await db.query(
      'INSERT INTO "User" ("id","username","name","role","passwordHash","active") SELECT $1,$1,$2,\'technician\',"passwordHash",true FROM "User" WHERE "id"=$3',
      [id, name, "user-technician"],
    );
    return { id, cookie: await local.login(id), name };
  }
  async function task(
    owner,
    { stage = "processing", title = "文字处理结果验收 " + Date.now() } = {},
  ) {
    const { admin, reporter } = await identities();
    const requestId = randomUUID();
    requestIds.push(requestId);
    let result = await local.request("/tickets", {
      cookie: reporter,
      method: "POST",
      body: {
        requestId,
        deviceId: "device-ac001",
        title,
        description: "仅本轮随机临时验收，结束后定向清理。",
        priority: "normal",
      },
    });
    assert.equal(result.response.status, 201);
    if (stage === "pending") return result.value;
    result = await local.request(`/admin/tickets/${result.value.id}/assign`, {
      cookie: admin,
      method: "POST",
      body: {
        requestId: randomUUID(),
        assigneeId: owner.id,
        expectedVersion: 0,
      },
    });
    assert.equal(result.response.status, 201);
    if (stage === "assigned") return result.value;
    result = await local.request(`/tasks/${result.value.id}/accept`, {
      cookie: owner.cookie,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 1,
      },
    });
    assert.equal(result.response.status, 201);
    if (stage === "confirming") {
      result = await local.request(`/tasks/${result.value.id}/result`, {
        cookie: owner.cookie,
        method: "POST",
        body: {
          requestId: randomUUID(),
          expectedVersion: 2,
          description:
            "已检查接线与制冷回路，清理滤网。\n连续试运行 30 分钟正常，提交用户验收。",
        },
      });
      assert.equal(result.response.status, 201);
    }
    return result.value;
  }
  async function cleanup() {
    if (requestIds.length)
      await db.query(
        'DELETE FROM "Ticket" WHERE "requestId"=ANY($1::uuid[]) AND "reporterId"=$2',
        [requestIds, "user-reporter-a"],
      );
    await local.dispose();
    if (users.length)
      await db.query('DELETE FROM "User" WHERE "id"=ANY($1::text[])', [users]);
  }
  return { identities, technician, task, cleanup };
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { taskFixtures } from "./lib/task-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  f = taskFixtures(local, db, "quote.native"),
  tokens = [];
const ck = (r, n) => {
  assert.equal(r.status, n, JSON.stringify(r.value));
  return r.value;
};
async function login(username) {
  const r = await nativeRequest("/mobile/auth/login", {
    method: "POST",
    body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
  });
  tokens.push(ck(r, 200).accessToken);
  return r.value.accessToken;
}
try {
  await local.waitForApi();
  const tech = await f.technician("RN报价维修员"),
    other = await f.technician("其他RN维修员"),
    a = await login(tech.id),
    b = await login(other.id),
    reporter = await login("reporter.a"),
    admin = await login("admin");
  const v = await f.task(tech, { serviceMode: "quoted" }),
    assigned = await f.task(tech, { serviceMode: "quoted", stage: "assigned" }),
    direct = await f.task(tech);
  const route = `/mobile/tasks/${v.id}/quote`;
  const input = {
    requestId: randomUUID(),
    expectedVersion: v.version,
    items: [
      {
        name: "更换控制板",
        quantity: 2,
        unitPriceCents: 12050,
        note: "含安装",
      },
    ],
  };
  const submit = (token, body = input, path = route, headers) =>
    nativeRequest(path, { token, method: "POST", body, headers });
  ck(await submit(undefined), 401);
  for (const token of [reporter, admin]) {
    ck(await nativeRequest(route, { token }), 403);
    ck(await submit(token), 403);
  }
  ck(await nativeRequest(route, { token: b }), 404);
  ck(await submit(b), 404);
  assert.equal(ck(await nativeRequest(route, { token: a }), 200).quote, null);
  ck(await submit(a, input, route, { Origin: "http://127.0.0.1:5173" }), 403);
  ck(await submit(a, { ...input, totalCents: 1 }), 400);
  ck(await submit(a, { ...input, expectedVersion: 0 }), 409);
  ck(
    await submit(a, {
      ...input,
      items: [{ ...input.items[0], quantity: 1.5 }],
    }),
    400,
  );
  ck(
    await submit(
      a,
      { ...input, expectedVersion: assigned.version },
      `/mobile/tasks/${assigned.id}/quote`,
    ),
    409,
  );
  ck(
    await submit(
      a,
      { ...input, expectedVersion: direct.version },
      `/mobile/tasks/${direct.id}/quote`,
    ),
    409,
  );
  const results = await Promise.all(Array.from({ length: 8 }, () => submit(a)));
  results.forEach((r) => ck(r, 201));
  assert.equal(new Set(results.map((r) => r.value.id)).size, 1);
  assert.equal(results[0].value.totalCents, 24100);
  ck(await submit(a, { ...input, requestId: randomUUID() }), 409);
  ck(
    await submit(a, {
      ...input,
      items: [{ ...input.items[0], note: "新内容" }],
    }),
    409,
  );
  assert.equal(
    ck(await nativeRequest(route, { token: a }), 200).quote.id,
    results[0].value.id,
  );
  const { admin: cookie } = await f.identities();
  assert.equal(
    (await local.request(`/admin/tickets/${v.id}`, { cookie })).value.version,
    v.version + 1,
  );
  await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE id=$2', [
    other.id,
    v.id,
  ]);
  try {
    ck(await nativeRequest(route, { token: a }), 404);
    ck(await submit(a), 404);
    assert.equal(
      ck(await nativeRequest(route, { token: b }), 200).quote.id,
      results[0].value.id,
    );
  } finally {
    await db.query('UPDATE "Ticket" SET "assigneeId"=$1 WHERE id=$2', [
      tech.id,
      v.id,
    ]);
  }
  console.log(
    "RN quotes API: native/browser boundary, technician/current assignee, DTO, server amount, version, same/distinct intent and current ownership replay passed.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { method: "POST", token }).catch(
      () => {},
    );
  await f.cleanup();
  await db.end();
}

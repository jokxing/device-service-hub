import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "alipay.close");
const require = createRequire(import.meta.url);
const {
  DatabaseService,
} = require("../apps/api/dist/database/database.service.js");
const {
  AlipaySandboxService,
} = require("../apps/api/dist/modules/payments/alipay/alipay-sandbox.service.js");
const database = new DatabaseService();
const remote = new Map();
let closeCalls = 0;
const service = new AlipaySandboxService(database, {
  query: async (id) => {
    const row = remote.get(id);
    if (row.missing) return { code: "40004", sub_code: "ACQ.TRADE_NOT_EXIST" };
    return {
      code: "10000",
      out_trade_no: id,
      total_amount: row.amount ?? "59.98",
      trade_no: row.tradeNo,
      trade_status: row.status,
    };
  },
  close: async (id) => {
    closeCalls++;
    const row = remote.get(id);
    if (row.mode === "unknown") throw new Error("timeout");
    if (row.mode === "missing-after-close") {
      row.missing = true;
      throw new Error("uncertain missing trade");
    }
    row.status = row.mode === "paid-race" ? "TRADE_SUCCESS" : "TRADE_CLOSED";
    if (row.mode === "lost-response") throw new Error("timeout after closing");
    return {
      code: row.mode === "paid-race" ? "40004" : "10000",
      out_trade_no: id,
      trade_no: row.tradeNo,
    };
  },
});
const actor = {
  id: "user-reporter-a",
  role: "reporter",
  name: "测试",
  username: "reporter.a",
};
const check = (result, code) => {
  assert.equal(result.response.status, code, JSON.stringify(result.value));
  return result.value;
};
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities();
  const tech = await fixtures.technician("关单验证维修员");
  const foreign = await local.login("reporter.b");
  let sequence = 0;
  async function payment(mode) {
    const task = await fixtures.orderedTask(tech);
    const result = check(
      await local.request(`/orders/${task.order.id}/alipay-sandbox`, {
        cookie: reporter,
        method: "POST",
        body: { requestId: randomUUID() },
      }),
      201,
    );
    remote.set(result.payment.id, {
      mode,
      status: "WAIT_BUYER_PAY",
      tradeNo: String(Date.now()) + String(++sequence).padStart(4, "0"),
    });
    return { ...task, payment: result.payment };
  }
  const close = (value) =>
    service.close(actor, value.order.id, value.payment.id);
  const read = (value) =>
    database.alipaySandboxPayment.findUniqueOrThrow({
      where: { id: value.payment.id },
    });
  const cancel = (value) =>
    local.request(`/orders/${value.order.id}/cancel`, {
      cookie: reporter,
      method: "POST",
      body: {
        requestId: randomUUID(),
        expectedVersion: 4,
        reason: "关单后取消验收",
      },
    });
  const first = await payment();
  const route = `/orders/${first.order.id}/alipay-sandbox/${first.payment.id}/close`;
  for (const [cookie, code] of [
    [undefined, 401],
    [admin, 403],
    [tech.cookie, 403],
    [foreign, 404],
  ])
    check(
      await local.request(route, { cookie, method: "POST", body: {} }),
      code,
    );
  remote.get(first.payment.id).missing = true;
  await assert.rejects(
    () => close(first),
    (error) => error.getStatus() === 409,
  );
  assert.equal(closeCalls, 0);
  assert.equal((await read(first)).status, "pending");
  remote.get(first.payment.id).missing = false;
  const outcomes = await Promise.all(
    Array.from({ length: 5 }, () => close(first)),
  );
  assert.ok(outcomes.every((result) => result.status === "closed"));
  const saved = await read(first),
    calls = closeCalls;
  assert.equal((await close(first)).status, "closed");
  assert.equal(closeCalls, calls);
  assert.deepEqual(await read(first), saved);
  assert.equal(check(await cancel(first), 201).status, "cancelled");
  const paid = await payment("paid-race");
  assert.equal((await close(paid)).status, "succeeded");
  check(await cancel(paid), 409);
  const uncertain = await payment("unknown");
  await assert.rejects(
    () => close(uncertain),
    (error) => error.getStatus() === 409,
  );
  assert.equal((await read(uncertain)).status, "pending");
  check(await cancel(uncertain), 409);
  const lost = await payment("lost-response");
  assert.equal((await close(lost)).status, "closed");
  const disappeared = await payment("missing-after-close");
  await db.query(
    `UPDATE "AlipaySandboxPayment" SET "expiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '2 minutes' WHERE id=$1`,
    [disappeared.payment.id],
  );
  await assert.rejects(
    () => close(disappeared),
    (error) => error.getStatus() === 409,
  );
  assert.equal(
    (await read(disappeared)).status,
    "pending",
    "Previously observed channel trade must not close on missing alone",
  );
  const expired = await payment();
  await db.query(
    `UPDATE "AlipaySandboxPayment" SET "expiresAt"=(clock_timestamp() AT TIME ZONE 'UTC')-INTERVAL '2 minutes' WHERE id=$1`,
    [expired.payment.id],
  );
  assert.equal(
    (await service.query(actor, expired.order.id, expired.payment.id)).status,
    "closed",
  );
  const invalid = await payment();
  remote.get(invalid.payment.id).amount = "0.01";
  const before = closeCalls;
  await assert.rejects(
    () => close(invalid),
    (error) => error.getStatus() === 503,
  );
  assert.equal(closeCalls, before);
  assert.equal((await read(invalid)).status, "pending");
  // Channel close cannot roll back. A failed local commit must be recovered by verified query.
  const rollback = await payment();
  const transaction = database.$transaction.bind(database);
  let transactions = 0;
  database.$transaction = (...args) => {
    if (++transactions === 3)
      throw new Error("Injected close persistence failure");
    return transaction(...args);
  };
  try {
    await assert.rejects(() => close(rollback));
  } finally {
    database.$transaction = transaction;
  }
  assert.equal((await read(rollback)).status, "pending");
  assert.equal(remote.get(rollback.payment.id).status, "TRADE_CLOSED");
  assert.equal((await close(rollback)).status, "closed");
  console.log(
    "Alipay close: owner scope, live-link safety, verified closure/replay, payment race, uncertain/lost responses, expiry, amount mismatch, cancel guard and commit recovery passed. Injected channel outcomes, NOT actual channel closure.",
  );
} finally {
  await fixtures.cleanup();
  await database.$disconnect();
  await db.end();
}

import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "alipay.refund");
const require = createRequire(import.meta.url);
const {
  DatabaseService,
} = require("../apps/api/dist/database/database.service.js");
const {
  AlipaySandboxRefundsService,
} = require("../apps/api/dist/modules/payments/alipay/alipay-sandbox-refunds.service.js");
const {
  AlipaySandboxService,
} = require("../apps/api/dist/modules/payments/alipay/alipay-sandbox.service.js");
const database = new DatabaseService(),
  remote = new Map(),
  submitted = [];
let mode = "success";
const gateway = {
  refund: async (id, refundId, amount) => {
    submitted.push({ id, refundId, amount });
    if (mode === "lost") throw new Error("Injected response loss");
    const trade = remote.get(id);
    return {
      code: "10000",
      out_trade_no: id,
      trade_no: trade,
      refund_fee: mode === "bad-amount" ? "0.01" : "59.98",
      fund_change: "Y",
    };
  },
  queryRefund: async (id, refundId) => ({
    code: "10000",
    out_trade_no: id,
    trade_no: remote.get(id),
    out_request_no: mode === "wrong-id" ? randomUUID() : refundId,
    refund_amount: "59.98",
    ...(mode === "pending" ? {} : { refund_status: "REFUND_SUCCESS" }),
  }),
};
const service = new AlipaySandboxRefundsService(database, gateway);
const check = (r, status) => {
  assert.equal(r.response.status, status, JSON.stringify(r.value));
  return r.value;
};
try {
  await local.waitForApi();
  const { reporter, admin } = await fixtures.identities(),
    foreign = await local.login("reporter.b"),
    tech = await fixtures.technician("沙箱退款验收维修员");
  const adminRow = (
    await db.query('SELECT id,name,username FROM "User" WHERE username=$1', [
      "admin",
    ])
  ).rows[0];
  const adminActor = { ...adminRow, role: "admin" },
    actor = {
      id: "user-reporter-a",
      role: "reporter",
      username: "reporter.a",
      name: "测试",
    };
  async function paid() {
    const task = await fixtures.orderedTask(tech);
    const payment = check(
      await local.request(`/orders/${task.order.id}/alipay-sandbox`, {
        cookie: reporter,
        method: "POST",
        body: { requestId: randomUUID() },
      }),
      201,
    ).payment;
    const tradeNo = String(Date.now()) + String(remote.size).padStart(4, "0");
    remote.set(payment.id, tradeNo);
    // Explicit fixture, not a real Alipay payment.
    await db.query(
      'UPDATE "AlipaySandboxPayment" SET status=$1,"tradeNo"=$2 WHERE id=$3',
      ["succeeded", tradeNo, payment.id],
    );
    return { ...task, payment };
  }
  const route = (v) =>
    `/orders/${v.order.id}/alipay-sandbox/${v.payment.id}/refund`;
  const request = (v, body, cookie = reporter) =>
    local.request(route(v), { cookie, method: "POST", body });
  const input = { requestId: randomUUID(), reason: " 改变维修计划 " },
    a = await paid();
  for (const [cookie, status] of [
    [null, 401],
    [admin, 403],
    [tech.cookie, 403],
    [foreign, 404],
  ])
    check(await request(a, input, cookie), status);
  for (const body of [
    { ...input, amountCents: 1 },
    { ...input, reason: " " },
    { ...input, reason: "x".repeat(501) },
    { ...input, requestId: "bad" },
  ])
    check(await request(a, body), 400);
  const responses = await Promise.all(
    Array.from({ length: 6 }, () => request(a, input)),
  );
  const record = check(responses[0], 201);
  for (const r of responses)
    assert.equal(check(r, 201).refund.id, record.refund.id);
  assert.equal(record.refund.reason, "改变维修计划");
  assert.equal(record.refund.amountCents, 5998);
  check(await request(a, { ...input, reason: "不同原因" }), 409);
  check(
    await local.request(`/orders/${a.order.id}/start`, {
      cookie: tech.cookie,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: a.ticket.version + 1 },
    }),
    409,
  );
  check(
    await local.request(route(a) + "/submit", {
      cookie: reporter,
      method: "POST",
      body: {},
    }),
    403,
  );
  check(
    await local.request(`/admin/orders/${a.order.id}/alipay-sandbox`, {
      cookie: tech.cookie,
    }),
    403,
  );
  check(
    await local.request(`/admin/orders/${a.order.id}/alipay-sandbox`, {
      cookie: admin,
    }),
    200,
  );
  check(
    await local.request(route(a) + "/query", {
      cookie: foreign,
      method: "POST",
      body: {},
    }),
    404,
  );
  assert.equal(submitted.length, 0);
  await Promise.all(
    Array.from({ length: 5 }, () =>
      service.submit(adminActor, a.order.id, a.payment.id),
    ),
  );
  assert.ok(
    submitted.every(
      (v) => v.refundId === record.refund.id && v.amount === 5998,
    ),
  );
  const result = await database.serviceOrder.findUniqueOrThrow({
    where: { id: a.order.id },
    include: { ticket: true, cancellation: true },
  });
  assert.equal(result.status, "cancelled");
  assert.equal(result.ticket.status, "cancelled");
  assert.ok(result.cancellation);
  assert.equal(
    (
      await database.alipaySandboxPayment.findUniqueOrThrow({
        where: { id: a.payment.id },
      })
    ).status,
    "succeeded",
  );
  const paymentService = new AlipaySandboxService(database, {
    query: async () => ({
      code: "10000",
      out_trade_no: a.payment.id,
      trade_no: remote.get(a.payment.id),
      total_amount: "59.98",
      trade_status: "TRADE_SUCCESS",
    }),
  });
  assert.equal(
    (await paymentService.query(actor, a.order.id, a.payment.id)).status,
    "succeeded",
  );
  const count = submitted.length;
  await service.submit(adminActor, a.order.id, a.payment.id);
  assert.equal(submitted.length, count);
  assert.equal(
    (await service.query(actor, a.order.id, a.payment.id)).refund.status,
    "succeeded",
  );
  const b = await paid();
  check(await request(b, { requestId: randomUUID(), reason: "恢复验收" }), 201);
  mode = "lost";
  await assert.rejects(() =>
    service.submit(adminActor, b.order.id, b.payment.id),
  );
  assert.equal(
    (
      await database.alipaySandboxRefund.findUnique({
        where: { paymentId: b.payment.id },
      })
    ).status,
    "processing",
  );
  mode = "pending";
  assert.equal(
    (await service.query(actor, b.order.id, b.payment.id)).refund.status,
    "processing",
  );
  mode = "wrong-id";
  await assert.rejects(() => service.query(actor, b.order.id, b.payment.id));
  mode = "success";
  assert.equal(
    (await service.query(actor, b.order.id, b.payment.id)).refund.status,
    "succeeded",
  );
  const c = await paid();
  check(await request(c, { requestId: randomUUID(), reason: "金额核对" }), 201);
  mode = "bad-amount";
  await assert.rejects(() =>
    service.submit(adminActor, c.order.id, c.payment.id),
  );
  assert.equal(
    (await database.serviceOrder.findUnique({ where: { id: c.order.id } }))
      .status,
    "awaiting_start",
  );
  mode = "success";
  const originalTransaction = database.$transaction.bind(database);
  database.$transaction = (fn, ...rest) =>
    originalTransaction(
      (tx) =>
        fn(
          new Proxy(tx, {
            get(target, key) {
              if (key === "serviceOrderCancellation")
                return new Proxy(target.serviceOrderCancellation, {
                  get(delegate, method) {
                    if (method === "create")
                      return async () => {
                        throw new Error("Injected audit failure");
                      };
                    return Reflect.get(delegate, method);
                  },
                });
              return Reflect.get(target, key);
            },
          }),
        ),
      ...rest,
    );
  try {
    await assert.rejects(() =>
      service.submit(adminActor, c.order.id, c.payment.id),
    );
  } finally {
    database.$transaction = originalTransaction;
  }
  assert.equal(
    (
      await database.alipaySandboxRefund.findUnique({
        where: { paymentId: c.payment.id },
      })
    ).status,
    "processing",
  );
  assert.equal(
    (await database.serviceOrder.findUnique({ where: { id: c.order.id } }))
      .status,
    "awaiting_start",
  );
  assert.equal(
    (await service.query(actor, c.order.id, c.payment.id)).refund.status,
    "succeeded",
  );
  const race = await paid();
  const competitors = await Promise.all([
    request(race, { requestId: randomUUID(), reason: "开工竞争" }),
    local.request(`/orders/${race.order.id}/start`, {
      cookie: tech.cookie,
      method: "POST",
      body: { requestId: randomUUID(), expectedVersion: race.ticket.version },
    }),
  ]);
  assert.equal(competitors.filter((r) => r.response.status === 201).length, 1);
  assert.equal(competitors.filter((r) => r.response.status === 409).length, 1);
  console.log(
    "Sandbox refunds: DTO/ownership/admin scope, normalized replay, fixed channel refund ID/full amount, refund-start competition, unknown/pending results, amount/request mismatch, audit rollback/recovery and preserved payment facts passed. Injected channel outcomes, NOT actual refund.",
  );
} finally {
  await fixtures.cleanup();
  await database.$disconnect();
  await db.end();
}

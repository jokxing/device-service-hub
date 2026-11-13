import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase(),
  fixtures = quoteFixtures(local, db, "alipay.sandbox");
const require = createRequire(import.meta.url);
const {
  DatabaseService,
} = require("../apps/api/dist/database/database.service.js");
const {
  AlipaySandboxService,
} = require("../apps/api/dist/modules/payments/alipay/alipay-sandbox.service.js");
const database = new DatabaseService();
const check = (r, s) => {
  assert.equal(r.response.status, s, JSON.stringify(r.value));
  return r.value;
};
let queryResult;
const service = new AlipaySandboxService(database, {
  query: async () => queryResult,
});
const actor = {
  id: "user-reporter-a",
  role: "reporter",
  name: "测试",
  username: "reporter.a",
};
const command = () => ({ requestId: randomUUID() });
try {
  await local.waitForApi();
  const { admin, reporter } = await fixtures.identities(),
    foreign = await local.login("reporter.b"),
    tech = await fixtures.technician("沙箱验证维修员");
  const a = await fixtures.orderedTask(tech),
    b = await fixtures.orderedTask(tech),
    input = command();
  const route = (v) => `/orders/${v.order.id}/alipay-sandbox`;
  const create = (cookie, v, body = input) =>
    local.request(route(v), { cookie, method: "POST", body });
  check(await create(undefined, a), 401);
  check(await create(admin, a), 403);
  check(await create(tech.cookie, a), 403);
  check(await create(foreign, a), 404);
  for (const body of [
    {},
    { requestId: "bad" },
    { ...input, amountCents: 1 },
    { ...input, channel: "alipay" },
  ])
    check(await create(reporter, a, body), 400);
  const outcomes = await Promise.all(
    Array.from({ length: 5 }, () => create(reporter, a)),
  );
  const result = check(outcomes[0], 201);
  for (const item of outcomes)
    assert.equal(check(item, 201).payment.id, result.payment.id);
  assert.equal(result.payment.amountCents, 5998);
  assert.equal(result.payment.status, "pending");
  assert.equal("requestId" in result.payment, false);
  const url = new URL(result.checkoutUrl);
  assert.equal(url.origin, "https://openapi-sandbox.dl.alipaydev.com");
  assert.equal(url.searchParams.get("method"), "alipay.trade.page.pay");
  const biz = JSON.parse(url.searchParams.get("biz_content"));
  assert.equal(biz.total_amount, "59.98");
  assert.equal(biz.out_trade_no, result.payment.id);
  assert.ok(biz.time_expire);
  const returnUrl = new URL(url.searchParams.get("return_url"));
  assert.equal(returnUrl.origin, "http://127.0.0.1:3000");
  assert.equal(returnUrl.pathname, "/payments/alipay-return");
  assert.equal(returnUrl.searchParams.get("orderId"), a.order.id);
  check(await create(reporter, b), 409);
  check(await create(reporter, a, command()), 409);
  check(
    await local.request(`/orders/${a.order.id}/payments`, {
      cookie: reporter,
      method: "POST",
      body: command(),
    }),
    409,
  );
  check(
    await local.request(`/orders/${a.order.id}/start`, {
      cookie: tech.cookie,
      method: "POST",
      body: { ...command(), expectedVersion: 4 },
    }),
    409,
  );
  check(
    await local.request(`/orders/${a.order.id}/cancel`, {
      cookie: reporter,
      method: "POST",
      body: { ...command(), expectedVersion: 4, reason: "沙箱结果待核实" },
    }),
    409,
  );
  check(await local.request(route(a), { cookie: foreign }), 404);
  // Gateway outcomes below are injected, not claimed as actual Alipay settlement.
  queryResult = { code: "40004", sub_code: "ACQ.TRADE_NOT_EXIST" };
  assert.equal(
    (await service.query(actor, a.order.id, result.payment.id)).status,
    "pending",
  );
  queryResult = {
    code: "10000",
    out_trade_no: result.payment.id,
    seller_id: biz.seller_id,
    total_amount: "0.01",
    trade_no: "202611120000000001",
    trade_status: "TRADE_SUCCESS",
  };
  await assert.rejects(() =>
    service.query(actor, a.order.id, result.payment.id),
  );
  queryResult.total_amount = "59.98";
  queryResult.seller_id = "wrong-seller";
  await assert.rejects(() =>
    service.query(actor, a.order.id, result.payment.id),
  );
  delete queryResult.seller_id;
  assert.equal(
    (await service.query(actor, a.order.id, result.payment.id)).status,
    "succeeded",
  );
  queryResult.trade_status = "WAIT_BUYER_PAY";
  assert.equal(
    (await service.query(actor, a.order.id, result.payment.id)).status,
    "succeeded",
  );
  assert.equal(check(await create(reporter, a), 201).checkoutUrl, null);
  // Three competing commands share one ticket lock; only a valid winner can persist.
  const race = await fixtures.orderedTask(tech);
  const competing = await Promise.all([
    create(reporter, race, command()),
    local.request(`/orders/${race.order.id}/start`, {
      cookie: tech.cookie,
      method: "POST",
      body: { ...command(), expectedVersion: 4 },
    }),
    local.request(`/orders/${race.order.id}/cancel`, {
      cookie: reporter,
      method: "POST",
      body: { ...command(), expectedVersion: 4, reason: "竞争取消" },
    }),
  ]);
  assert.equal(competing.filter((r) => r.response.status === 201).length, 1);
  assert.equal(competing.filter((r) => r.response.status === 409).length, 2);
  // Original mock path remains separate.
  const mock = check(
    await local.request(`/orders/${b.order.id}/payments`, {
      cookie: reporter,
      method: "POST",
      body: command(),
    }),
    201,
  );
  assert.equal(mock.channel, "mock");
  check(await create(reporter, b, command()), 409);
  const expired = await fixtures.orderedTask(tech);
  const expiredRecord = check(
    await create(reporter, expired, command()),
    201,
  ).payment;
  await db.query(
    "UPDATE \"AlipaySandboxPayment\" SET \"expiresAt\"=(clock_timestamp() AT TIME ZONE 'UTC') - INTERVAL '2 minutes' WHERE id=$1",
    [expiredRecord.id],
  );
  queryResult = { code: "40004", sub_code: "ACQ.TRADE_NOT_EXIST" };
  assert.equal(
    (await service.query(actor, expired.order.id, expiredRecord.id)).status,
    "closed",
  );
  assert.ok(check(await create(reporter, expired, command()), 201).checkoutUrl);
  console.log(
    "Alipay sandbox API: ownership, DTO, snapshot, idempotency, cashier signing, mixed-channel/start/cancel races passed. Query state transitions used injected gateway outcomes, not actual payments.",
  );
} finally {
  await fixtures.cleanup();
  await database.$disconnect();
  await db.end();
}

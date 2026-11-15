import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { openLocalApi } from "./lib/local-api.mjs";
import { nativeRequest } from "./lib/native-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";
const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "native.alipay"),
  tokens = [];
const check = (r, status) => {
  assert.equal(r.status, status, `Unexpected HTTP status: ${r.status}`);
  return r.value;
};
async function login(username) {
  const result = check(
    await nativeRequest("/mobile/auth/login", {
      method: "POST",
      body: { username, password: process.env.SEED_ACCOUNT_PASSWORD },
    }),
    200,
  );
  tokens.push(result.accessToken);
  return result.accessToken;
}
try {
  await local.waitForApi();
  const { reporter } = await fixtures.identities();
  const tech = await fixtures.technician("APP支付接口验证");
  const task = await fixtures.orderedTask(tech);
  const owner = await login("reporter.a"),
    foreign = await login("reporter.b"),
    technician = await login(tech.id),
    admin = await login("admin");
  const route = `/mobile/orders/${task.order.id}/alipay-sandbox`,
    input = { requestId: randomUUID() };
  const create = (token = owner, body = input, headers) =>
    nativeRequest(route, { token, method: "POST", body, headers });
  check(await nativeRequest(route), 401);
  check(await create(foreign), 404);
  for (const token of [technician, admin]) check(await create(token), 403);
  for (const body of [
    {},
    { requestId: "bad" },
    { ...input, amountCents: 1 },
    { ...input, checkoutKind: "page" },
  ])
    check(await create(owner, body), 400);
  for (const headers of [
    { Origin: "http://127.0.0.1:5173" },
    { Cookie: "fake=x" },
  ])
    check(await create(owner, input, headers), 403);
  const created = await Promise.all(Array.from({ length: 5 }, () => create()));
  const first = check(created[0], 201);
  created.forEach((r) =>
    assert.equal(check(r, 201).payment.id, first.payment.id),
  );
  assert.equal(first.payment.checkoutKind, "app");
  assert.equal(first.payment.amountCents, task.order.totalCents);
  const safety = check(
    await nativeRequest(`/mobile/orders/${task.order.id}/payments`, {
      token: owner,
    }),
    200,
  );
  assert.equal(safety.blockCancellation, true);
  const params = new URLSearchParams(first.orderString);
  assert.equal(params.get("method"), "alipay.trade.app.pay");
  assert.equal(params.get("sign_type"), "RSA2");
  assert.equal(params.has("return_url"), false);
  const biz = JSON.parse(params.get("biz_content"));
  assert.equal(biz.product_code, "QUICK_MSECURITY_PAY");
  assert.equal(biz.out_trade_no, first.payment.id);
  assert.equal(biz.total_amount, "59.98");
  assert.ok(params.get("sign"));
  const web = await local.request(
    `/orders/${task.order.id}/alipay-sandbox/${first.payment.id}/checkout`,
    { method: "POST", cookie: reporter },
  );
  assert.equal(web.response.status, 409);
  check(await create(owner, { requestId: randomUUID() }), 409);
  check(
    await nativeRequest(route + `/${first.payment.id}/checkout`, {
      method: "POST",
      token: foreign,
    }),
    404,
  );
  const continued = check(
    await nativeRequest(route + `/${first.payment.id}/checkout`, {
      method: "POST",
      token: owner,
    }),
    201,
  );
  assert.equal(continued.payment.id, first.payment.id);
  assert.equal(
    check(await nativeRequest(route, { token: owner }), 200).payments.length,
    1,
  );
  // Do not send a signed order to the wallet or claim buyer payment in API tests.
  const pageTask = await fixtures.orderedTask(tech);
  const pageResult = await local.request(
    `/orders/${pageTask.order.id}/alipay-sandbox`,
    { method: "POST", cookie: reporter, body: { requestId: randomUUID() } },
  );
  assert.equal(pageResult.response.status, 201);
  assert.equal(pageResult.value.payment.checkoutKind, "page");
  check(
    await nativeRequest(
      `/mobile/orders/${pageTask.order.id}/alipay-sandbox/${pageResult.value.payment.id}/checkout`,
      { method: "POST", token: owner },
    ),
    409,
  );
  console.log(
    "Passed: native auth/ownership, DTO, concurrent replay, immutable checkout kind, APP signing fields, continuation; no buyer payment executed.",
  );
} finally {
  for (const token of tokens)
    await nativeRequest("/mobile/auth/logout", { token, method: "POST" }).catch(
      () => {},
    );
  await fixtures.cleanup();
  await local.dispose();
  await db.end();
}

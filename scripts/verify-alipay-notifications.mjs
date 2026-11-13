import assert from "node:assert/strict";
import { generateKeyPairSync, randomUUID, sign } from "node:crypto";
import { createRequire } from "node:module";
import { request as httpRequest } from "node:http";
import { openLocalApi } from "./lib/local-api.mjs";
import { quoteFixtures } from "./lib/quote-fixtures.mjs";

const local = openLocalApi(),
  db = await local.connectDatabase();
const fixtures = quoteFixtures(local, db, "alipay.notify");
const require = createRequire(
  new URL("../apps/api/package.json", import.meta.url),
);
require("reflect-metadata");
const { Module } = require("@nestjs/common");
const { NestFactory, APP_GUARD } = require("@nestjs/core");
const { DatabaseService } = require("./dist/database/database.service.js");
const {
  AlipaySandboxService,
} = require("./dist/modules/payments/alipay/alipay-sandbox.service.js");
const {
  AlipaySandboxNotificationsController,
} = require("./dist/modules/payments/alipay/alipay-sandbox-notifications.controller.js");
const {
  sandboxNotificationParser,
} = require("./dist/modules/payments/alipay/sandbox-notification-parser.js");
const {
  verifyNotification,
} = require("./dist/modules/payments/alipay/sandbox-notification.js");
const { OriginGuard } = require("./dist/modules/auth/guards/origin.guard.js");
const {
  getAlipaySandboxConfig,
} = require("./dist/config/alipay-sandbox.config.js");
const config = getAlipaySandboxConfig();
// Ephemeral test key pair only; never replace the configured Alipay public/private keys.
const pair = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const database = new DatabaseService();
let queryResult;
const service = new AlipaySandboxService(database, {
  notification: (body) => verifyNotification(body, pair.publicKey),
  query: async () => queryResult,
});
class NotificationTestModule {}
Module({
  controllers: [AlipaySandboxNotificationsController],
  providers: [
    { provide: AlipaySandboxService, useValue: service },
    { provide: APP_GUARD, useClass: OriginGuard },
  ],
})(NotificationTestModule);
let app;
const actor = {
  id: "user-reporter-a",
  role: "reporter",
  name: "测试",
  username: "reporter.a",
};
function encode(fields) {
  const source = Object.keys(fields)
    .filter((k) => !["sign", "sign_type"].includes(k) && fields[k] !== "")
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("&");
  return new URLSearchParams({
    ...fields,
    sign_type: "RSA2",
    sign: sign("RSA-SHA256", Buffer.from(source), pair.privateKey).toString(
      "base64",
    ),
  }).toString();
}
try {
  await local.waitForApi();
  app = await NestFactory.create(NotificationTestModule, {
    bodyParser: false,
    logger: false,
  });
  app.setGlobalPrefix("api");
  app.use("/api/payments/alipay-sandbox/notify", sandboxNotificationParser);
  await app.listen(0, "127.0.0.1");
  const endpoint = (await app.getUrl()) + "/api/payments/alipay-sandbox/notify";
  const post = async (body, status = 200, headers = {}, url = endpoint) => {
    const response = await new Promise((resolve, reject) => {
      const req = httpRequest(
        url,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            ...headers,
          },
        },
        (res) => {
          let text = "";
          res.setEncoding("utf8");
          res.on("data", (chunk) => {
            text += chunk;
          });
          res.on("end", () =>
            resolve({ status: res.statusCode, headers: res.headers, text }),
          );
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.end(body);
    });
    const text = response.text;
    assert.equal(response.status, status, `notification response ${text}`);
    if (status === 200) {
      assert.equal(text, "success");
      assert.match(response.headers["content-type"], /^text\/plain/);
    } else assert.notEqual(text, "success");
  };
  const { reporter } = await fixtures.identities();
  const tech = await fixtures.technician("回调验收维修员");
  async function payment() {
    const value = await fixtures.orderedTask(tech);
    const result = await local.request(
      `/orders/${value.order.id}/alipay-sandbox`,
      {
        cookie: reporter,
        method: "POST",
        body: { requestId: randomUUID() },
      },
    );
    assert.equal(result.response.status, 201);
    return { ...value, payment: result.value.payment };
  }
  const a = await payment();
  const fields = {
    app_id: config.appId,
    auth_app_id: config.appId,
    seller_id: config.sellerId,
    out_trade_no: a.payment.id,
    trade_no: "202611130000000001",
    total_amount: "59.98",
    trade_status: "TRADE_SUCCESS",
    notify_type: "trade_status_sync",
    notify_id: randomUUID(),
    charset: "utf-8",
    version: "1.0",
    subject: "维修 + 配件&检测",
  };
  const valid = encode(fields);
  await post(valid.replace("59.98", "0.01"), 400);
  for (const changes of [
    { total_amount: "0.01" },
    { app_id: "wrong" },
    { seller_id: "wrong" },
    { out_trade_no: randomUUID() },
    { trade_status: "UNKNOWN" },
    { trade_no: "bad" },
  ])
    await post(encode({ ...fields, ...changes }), 400);
  await post(valid + "&total_amount=59.98", 400);
  for (const headers of [
    { Origin: "http://127.0.0.1:3000" },
    { Cookie: "x=y" },
    { Authorization: "Bearer invalid" },
    { "Sec-Fetch-Site": "cross-site" },
  ])
    await post(valid, 403, headers);
  await post("{}", 415, { "Content-Type": "application/json" });
  await post("x=" + "a".repeat(17000), 413);
  // Actual running API must reject this test key; origin exemption is NOT authentication.
  await post(
    valid,
    400,
    {},
    "http://127.0.0.1:3001/api/payments/alipay-sandbox/notify",
  );
  assert.equal(
    (
      await database.alipaySandboxPayment.findUniqueOrThrow({
        where: { id: a.payment.id },
      })
    ).status,
    "pending",
  );
  // Concurrent replays and a stale query resolve through the same real database transaction.
  queryResult = {
    code: "10000",
    out_trade_no: a.payment.id,
    total_amount: "59.98",
    trade_no: fields.trade_no,
    trade_status: "WAIT_BUYER_PAY",
  };
  await Promise.all([
    service.query(actor, a.order.id, a.payment.id),
    ...Array.from({ length: 6 }, () => post(valid)),
  ]);
  const paid = await database.alipaySandboxPayment.findUniqueOrThrow({
    where: { id: a.payment.id },
  });
  assert.equal(paid.status, "succeeded");
  await post(valid);
  await post(
    encode({
      ...fields,
      trade_status: "TRADE_FINISHED",
      notify_id: randomUUID(),
    }),
  );
  await post(encode({ ...fields, trade_status: "WAIT_BUYER_PAY" }));
  await post(encode({ ...fields, trade_status: "TRADE_CLOSED" }));
  assert.deepEqual(
    await database.alipaySandboxPayment.findUniqueOrThrow({
      where: { id: a.payment.id },
    }),
    paid,
  );
  await post(encode({ ...fields, trade_no: "202611130000000099" }), 409);
  // A DB failure must not acknowledge, and retry must recover without partial writes.
  const b = await payment();
  const next = {
    ...fields,
    out_trade_no: b.payment.id,
    trade_no: "202611130000000002",
  };
  const realTransaction = database.$transaction.bind(database);
  database.$transaction = async () => {
    throw new Error("Injected transaction failure");
  };
  try {
    await post(encode(next), 500);
  } finally {
    database.$transaction = realTransaction;
  }
  assert.equal(
    (
      await database.alipaySandboxPayment.findUniqueOrThrow({
        where: { id: b.payment.id },
      })
    ).status,
    "pending",
  );
  await post(encode({ ...next, trade_status: "TRADE_CLOSED" }));
  await post(encode({ ...next, trade_status: "WAIT_BUYER_PAY" }));
  await post(encode(next), 409);
  assert.equal(
    (
      await database.alipaySandboxPayment.findUniqueOrThrow({
        where: { id: b.payment.id },
      })
    ).status,
    "closed",
  );
  assert.equal(
    (
      await database.serviceOrder.findUniqueOrThrow({
        where: { id: a.order.id },
      })
    ).status,
    "awaiting_start",
  );
  console.log(
    "Alipay notifications: RSA2 form HTTP -> service -> local DB, invalid signature/identity/amount, replay, query race, terminal consistency and failure/retry passed. Generated test keys; NOT an actual Alipay callback.",
  );
} finally {
  if (app) await app.close();
  await fixtures.cleanup();
  await database.$disconnect();
  await db.end();
}

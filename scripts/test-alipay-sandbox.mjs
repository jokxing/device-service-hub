import assert from "node:assert/strict";
import { test } from "node:test";
import { generateKeyPairSync, sign, verify } from "node:crypto";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const protocol = require("../apps/api/dist/modules/payments/alipay/sandbox-protocol.js");
const {
  AlipaySandboxGateway,
} = require("../apps/api/dist/modules/payments/alipay/alipay-sandbox.gateway.js");
const configModule = require("../apps/api/dist/config/alipay-sandbox.config.js");
const {
  verifyNotification,
} = require("../apps/api/dist/modules/payments/alipay/sandbox-notification.js");
const pair = generateKeyPairSync("rsa", {
  modulusLength: 2048,
  privateKeyEncoding: { type: "pkcs1", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
test("close gateway signs the fixed sandbox method and verifies the close response node", async () => {
  const originalFetch = globalThis.fetch;
  const originalConfig = configModule.getAlipaySandboxConfig;
  configModule.getAlipaySandboxConfig = () => ({
    appId: "test",
    sellerId: "test",
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
  });
  let wrongNode = false;
  globalThis.fetch = async (url, options) => {
    assert.equal(url, configModule.ALIPAY_SANDBOX_GATEWAY);
    assert.equal(options.body.get("method"), "alipay.trade.close");
    assert.deepEqual(JSON.parse(options.body.get("biz_content")), {
      out_trade_no: "test-payment",
    });
    const raw = '{"code":"10000","out_trade_no":"test-payment"}';
    const signature = sign(
      "RSA-SHA256",
      Buffer.from(raw),
      pair.privateKey,
    ).toString("base64");
    return new Response(
      `{"${wrongNode ? "alipay_trade_query_response" : "alipay_trade_close_response"}":${raw},"sign":"${signature}"}`,
    );
  };
  try {
    assert.equal(
      (await new AlipaySandboxGateway().close("test-payment")).code,
      "10000",
    );
    wrongNode = true;
    await assert.rejects(() =>
      new AlipaySandboxGateway().close("test-payment"),
    );
  } finally {
    globalThis.fetch = originalFetch;
    configModule.getAlipaySandboxConfig = originalConfig;
  }
});
test("RSA2 request sorting, percent encoding remains transport-only", () => {
  const signature = protocol.signParams(
    { z: "维修&测试", a: "1", empty: "" },
    pair.privateKey,
  );
  assert.ok(
    verify(
      "RSA-SHA256",
      Buffer.from("a=1&z=维修&测试"),
      pair.publicKey,
      Buffer.from(signature, "base64"),
    ),
  );
});
test("refund and refund-query use fixed request number, integer amount and distinct signed nodes", async () => {
  const originalFetch = globalThis.fetch,
    originalConfig = configModule.getAlipaySandboxConfig;
  configModule.getAlipaySandboxConfig = () => ({
    appId: "test",
    sellerId: "test",
    privateKey: pair.privateKey,
    publicKey: pair.publicKey,
  });
  let method = "alipay.trade.refund",
    node = "alipay_trade_refund_response";
  globalThis.fetch = async (url, options) => {
    assert.equal(url, configModule.ALIPAY_SANDBOX_GATEWAY);
    assert.equal(options.body.get("method"), method);
    const biz = JSON.parse(options.body.get("biz_content"));
    assert.equal(biz.out_trade_no, "payment");
    assert.equal(biz.out_request_no, "refund");
    if (method === "alipay.trade.refund")
      assert.equal(biz.refund_amount, "59.98");
    const raw = '{"code":"10000"}',
      signature = sign(
        "RSA-SHA256",
        Buffer.from(raw),
        pair.privateKey,
      ).toString("base64");
    return new Response(`{"${node}":${raw},"sign":"${signature}"}`);
  };
  try {
    const gateway = new AlipaySandboxGateway();
    assert.equal(
      (await gateway.refund("payment", "refund", 5998)).code,
      "10000",
    );
    method = "alipay.trade.fastpay.refund.query";
    node = "alipay_trade_fastpay_refund_query_response";
    assert.equal(
      (await gateway.queryRefund("payment", "refund")).code,
      "10000",
    );
  } finally {
    globalThis.fetch = originalFetch;
    configModule.getAlipaySandboxConfig = originalConfig;
  }
});
test("response uses original bytes including escaped strings and nested JSON", () => {
  const raw = '{"code":"10000", "memo":"}\\\"{", "nested":{"a":2}}';
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(raw),
    pair.privateKey,
  ).toString("base64");
  const response =
    '{"alipay_trade_query_response":' + raw + ',"sign":"' + signature + '"}';
  assert.ok(
    protocol.verifyResponse(
      response,
      "alipay_trade_query_response",
      signature,
      pair.publicKey,
    ),
  );
  assert.equal(
    protocol.verifyResponse(
      response.replace('"10000"', '"40004"'),
      "alipay_trade_query_response",
      signature,
      pair.publicKey,
    ),
    false,
  );
});
test("amount conversion is integer based and expiry is China standard time", () => {
  assert.equal(protocol.yuanToCents("59.98"), 5998);
  assert.equal(protocol.yuanToCents("0.01"), 1);
  for (const value of ["1e2", "1.001", "-1", 1, "NaN"])
    assert.throws(() => protocol.yuanToCents(value));
  assert.equal(
    protocol.chinaTime(new Date("2026-11-12T00:00:00.000Z")),
    "2026-11-12 08:00:00",
  );
});

test("notifications exclude sign_type, decode once, reject tampering and duplicate fields", () => {
  const fields = {
    app_id: "20260001",
    charset: "utf-8",
    subject: "维修 + 配件&检测",
    total_amount: "0.05",
  };
  const source = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join("&");
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(source),
    pair.privateKey,
  ).toString("base64");
  const body = new URLSearchParams({
    ...fields,
    sign_type: "RSA2",
    sign: signature,
  }).toString();
  assert.equal(
    verifyNotification(body, pair.publicKey).subject,
    fields.subject,
  );
  for (const invalid of [
    body.replace("0.05", "0.06"),
    body + "&app_id=20260001",
    body + "&%61pp_id=20260001",
    body.replace("RSA2", "RSA"),
    body + "&memo=%XX",
    {},
    "",
  ])
    assert.throws(() => verifyNotification(invalid, pair.publicKey));
});

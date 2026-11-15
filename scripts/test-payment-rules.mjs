import assert from "node:assert/strict";
import test from "node:test";
import {
  canRequestMockRefund,
  canRequestAlipayRefund,
} from "../packages/contracts/src/payment-rules.ts";
test("退款入口只允许当前待开工订单的已成功且未申请支付单", () => {
  const order = { id: "order", status: "awaiting_start" },
    payment = { orderId: "order", status: "succeeded", refund: null };
  assert.equal(canRequestMockRefund(order, payment), true);
  for (const patch of [
    { status: "pending" },
    { status: "closed" },
    { refund: { id: "existing" } },
    { orderId: "other" },
  ])
    assert.equal(canRequestMockRefund(order, { ...payment, ...patch }), false);
  for (const status of [
    "in_progress",
    "awaiting_confirmation",
    "completed",
    "cancelled",
  ])
    assert.equal(canRequestMockRefund({ ...order, status }, payment), false);
});
test("Alipay full-refund eligibility matches owner order, unstarted state and one request", () => {
  const order = { id: "order", status: "awaiting_start" };
  const payment = { orderId: "order", status: "succeeded", refund: null };
  assert.equal(canRequestAlipayRefund(order, payment), true);
  for (const change of [
    { status: "pending" },
    { status: "closed" },
    { orderId: "foreign" },
    { refund: { status: "requested" } },
  ])
    assert.equal(
      canRequestAlipayRefund(order, { ...payment, ...change }),
      false,
    );
  for (const status of [
    "in_progress",
    "awaiting_confirmation",
    "completed",
    "cancelled",
  ])
    assert.equal(canRequestAlipayRefund({ ...order, status }, payment), false);
});

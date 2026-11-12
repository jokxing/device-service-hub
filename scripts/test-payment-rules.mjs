import assert from "node:assert/strict";
import test from "node:test";
import { canRequestMockRefund } from "../packages/contracts/src/payment-rules.ts";
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

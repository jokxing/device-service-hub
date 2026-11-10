import assert from "node:assert/strict";
import test from "node:test";
import { canCancelOrder } from "../apps/portal/src/features/orders/rules.ts";

test("取消入口仅展示给关联工单仍待履约、无结果及确认的待开工订单", () => {
  const ticket = {
    id: "ticket",
    serviceMode: "quoted",
    status: "processing",
    result: null,
    confirmation: null,
  };
  const order = {
    ticketId: "ticket",
    status: "awaiting_start",
    cancellation: null,
  };
  assert.equal(canCancelOrder(ticket, order), true);
  for (const status of [
    "pending",
    "assigned",
    "confirming",
    "completed",
    "cancelled",
  ])
    assert.equal(canCancelOrder({ ...ticket, status }, order), false);
  assert.equal(canCancelOrder({ ...ticket, result: {} }, order), false);
  assert.equal(canCancelOrder({ ...ticket, confirmation: {} }, order), false);
  assert.equal(
    canCancelOrder({ ...ticket, serviceMode: "direct" }, order),
    false,
  );
  assert.equal(canCancelOrder(ticket, { ...order, ticketId: "other" }), false);
  assert.equal(
    canCancelOrder(ticket, { ...order, status: "cancelled" }),
    false,
  );
  assert.equal(canCancelOrder(ticket, { ...order, cancellation: {} }), false);
});

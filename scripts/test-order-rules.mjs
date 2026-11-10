import assert from "node:assert/strict";
import test from "node:test";
import { canCancelOrder } from "../apps/portal/src/features/orders/rules.ts";
import {
  orderListQuery,
  readOrderStatus,
} from "../packages/contracts/src/order-rules.ts";

test("订单筛选与分页查询保持状态，非法状态不进入客户端请求", () => {
  assert.equal(readOrderStatus("completed"), "completed");
  for (const value of ["processing", "bad", ["completed"], null])
    assert.equal(readOrderStatus(value), undefined);
  assert.equal(orderListQuery(1), "");
  assert.equal(orderListQuery(2, "cancelled"), "status=cancelled&page=2");
  assert.equal(orderListQuery(1, "completed"), "status=completed");
});
import {
  canStartOrder,
  canSubmitOrderResult,
} from "../apps/web/src/features/orders/rules.ts";

test("报价型结果入口要求已开工且工单仍处理中，不允许待开工、已取消或终结状态", () => {
  const task = {
    id: "t",
    serviceMode: "quoted",
    status: "processing",
    acceptance: {},
    result: null,
    confirmation: null,
  };
  const order = {
    ticketId: "t",
    status: "in_progress",
    start: {},
    cancellation: null,
  };
  assert.equal(canSubmitOrderResult(task, order), true);
  for (const status of [
    "awaiting_start",
    "cancelled",
    "awaiting_confirmation",
    "completed",
  ])
    assert.equal(canSubmitOrderResult(task, { ...order, status }), false);
  for (const patch of [
    { status: "confirming" },
    { status: "completed" },
    { acceptance: null },
    { result: {} },
    { confirmation: {} },
    { serviceMode: "direct" },
  ])
    assert.equal(canSubmitOrderResult({ ...task, ...patch }, order), false);
  assert.equal(canSubmitOrderResult(task, { ...order, start: null }), false);
  assert.equal(
    canSubmitOrderResult(task, { ...order, cancellation: {} }),
    false,
  );
  assert.equal(
    canSubmitOrderResult(task, { ...order, ticketId: "other" }),
    false,
  );
});

test("开工入口仅面向已接单且无结果的需报价待开工订单", () => {
  const task = {
    id: "t",
    serviceMode: "quoted",
    status: "processing",
    acceptance: {},
    result: null,
    confirmation: null,
  };
  const order = {
    ticketId: "t",
    status: "awaiting_start",
    start: null,
    cancellation: null,
  };
  assert.equal(canStartOrder(task, order), true);
  for (const status of [
    "pending",
    "assigned",
    "confirming",
    "completed",
    "cancelled",
  ])
    assert.equal(canStartOrder({ ...task, status }, order), false);
  for (const patch of [
    { result: {} },
    { confirmation: {} },
    { acceptance: null },
    { serviceMode: "direct" },
  ])
    assert.equal(canStartOrder({ ...task, ...patch }, order), false);
  for (const patch of [
    { ticketId: "other" },
    { status: "cancelled" },
    { status: "in_progress" },
    { start: {} },
    { cancellation: {} },
  ])
    assert.equal(canStartOrder(task, { ...order, ...patch }), false);
  assert.equal(
    canCancelOrder(task, { ...order, status: "in_progress" }),
    false,
  );
});

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

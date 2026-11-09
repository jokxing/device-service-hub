import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateQuote,
  formatCents,
  parsePriceCents,
} from "@device-service-hub/contracts/quote-rules";
import { canSubmitQuote } from "../apps/web/src/features/quotes/quoteRules.ts";
import { canSubmitTaskResult } from "../apps/web/src/features/tickets/taskRules.ts";
import { canAcceptQuote } from "../apps/portal/src/features/quotes/rules.ts";

const item = (quantity, unitPriceCents) => ({
  name: "配件",
  quantity,
  unitPriceCents,
  note: "",
});

test("门户仅对待确认报价且尚无订单的本人处理中工单显示确认入口", () => {
  const ticket = { status: "processing", serviceMode: "quoted", result: null };
  assert.equal(canAcceptQuote(ticket, { status: "pending" }, false), true);
  assert.equal(canAcceptQuote(ticket, { status: "accepted" }, false), false);
  assert.equal(canAcceptQuote(ticket, { status: "pending" }, true), false);
  assert.equal(
    canAcceptQuote(
      { ...ticket, serviceMode: "direct" },
      { status: "pending" },
      false,
    ),
    false,
  );
  assert.equal(
    canAcceptQuote(
      { ...ticket, status: "completed" },
      { status: "pending" },
      false,
    ),
    false,
  );
  assert.equal(
    canAcceptQuote({ ...ticket, result: {} }, { status: "pending" }, false),
    false,
  );
});
test("金额从十进制文本精确转换，禁止静默截断或科学计数法", () => {
  for (const [text, cents] of [
    ["0.01", 1],
    ["0.1", 10],
    ["19.99", 1999],
    ["100000.00", 10000000],
  ]) {
    assert.equal(parsePriceCents(text), cents);
    assert.equal(parsePriceCents(formatCents(cents)), cents);
  }
  for (const text of [
    "",
    "-1",
    "1.001",
    "1e2",
    "1,000",
    "01",
    "100000.01",
    " 1",
    "NaN",
  ])
    assert.throws(() => parsePriceCents(text));
  assert.throws(() => formatCents(0.1));
});
test("整数分计算多条目、零价赠品、总额上限及零总价", () => {
  assert.deepEqual(calculateQuote([item(3, 1999), item(1, 1), item(2, 0)]), {
    totalCents: 5998,
    amounts: [5997, 1, 0],
  });
  assert.equal(calculateQuote([item(10, 10000000)]).totalCents, 100000000);
  for (const items of [
    [],
    [item(1, 0)],
    [item(11, 10000000)],
    [item(1.1, 100)],
    [item(1, 0.1)],
    [item(1000, 1)],
    Array.from({ length: 21 }, () => item(1, 1)),
  ])
    assert.throws(() => calculateQuote(items));
});
test("需报价任务不能使用直接处理入口，未接单不可报价", () => {
  for (const serviceMode of ["direct", "quoted"])
    for (const status of [
      "pending",
      "assigned",
      "processing",
      "confirming",
      "completed",
      "cancelled",
    ]) {
      assert.equal(
        canSubmitQuote({ status, serviceMode }),
        status === "processing" && serviceMode === "quoted",
      );
      assert.equal(
        canSubmitTaskResult({ status, serviceMode }),
        status === "processing" && serviceMode === "direct",
      );
    }
});

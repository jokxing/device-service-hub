import assert from "node:assert/strict";
import test from "node:test";
import { normalizeQuoteItems } from "../apps/mobile/src/features/quotes/quoteForm.ts";
const item = {
  id: "a",
  name: " 控制板 ",
  quantity: "2",
  price: "120.50",
  note: " 含安装 ",
};
test("RN报价精确分金额与规范化意图", () => {
  assert.deepEqual(normalizeQuoteItems([item]), [
    { name: "控制板", quantity: 2, unitPriceCents: 12050, note: "含安装" },
  ]);
  assert.deepEqual(
    normalizeQuoteItems([{ ...item, id: "other" }]),
    normalizeQuoteItems([item]),
  );
  for (const patch of [
    { name: " " },
    { quantity: "1.2" },
    { quantity: "1000" },
    { price: "1.001" },
    { price: "0" },
    { note: "x".repeat(201) },
  ])
    assert.throws(() => normalizeQuoteItems([{ ...item, ...patch }]));
  assert.throws(() => normalizeQuoteItems([]));
});

import { canSubmitTaskResult } from "../apps/mobile/src/features/tasks/rules.ts";
test("RN需报价任务不展示直接处理入口", () => {
  assert.equal(
    canSubmitTaskResult({
      status: "processing",
      result: null,
      serviceMode: "quoted",
    }),
    false,
  );
  assert.equal(
    canSubmitTaskResult({
      status: "processing",
      result: null,
      serviceMode: "direct",
    }),
    true,
  );
});

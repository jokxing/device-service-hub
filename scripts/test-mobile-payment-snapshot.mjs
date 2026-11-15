import assert from "node:assert/strict";
import test from "node:test";
import { readMyPayments } from "../apps/mobile/src/features/payments/api.ts";

test("payment snapshot preserves records, request cancellation and explicit permission", async () => {
  const controller = new AbortController();
  const payments = [{ id: "historical-payment" }];
  let calls = 0;
  const snapshot = await readMyPayments(
    async (path, signal) => {
      calls++;
      assert.equal(path, "/mobile/orders/order%2Fid/payments");
      assert.equal(signal, controller.signal);
      return { payments, blockCancellation: false };
    },
    "order/id",
    controller.signal,
  );
  assert.equal(calls, 1);
  assert.equal(snapshot.payments, payments);
  assert.equal(snapshot.blockCancellation, false);
});

test("unknown cancellation permission remains blocked", async () => {
  for (const flag of [undefined, null, true, "false", 0]) {
    const snapshot = await readMyPayments(
      async () => ({ payments: [], blockCancellation: flag }),
      "order",
    );
    assert.equal(snapshot.blockCancellation, true);
  }
});

test("failed payment reads cannot become an allowed empty snapshot", async () => {
  await assert.rejects(
    readMyPayments(async () => {
      throw new Error("offline");
    }, "order"),
    /offline/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import { reconcileAlipayReturn } from "../apps/mobile/src/features/payments/alipay/reconcileAlipayReturn.ts";

const row = (status = "pending") => ({ id: "new-payment", status });
test("processing refunds use the dedicated verifier; original successful payment is not queried", async () => {
  const result = await reconcileAlipayReturn(
    async () => ({
      payments: [{ ...row("succeeded"), refund: { status: "processing" } }],
    }),
    async () => {
      throw Error("must retain payment success");
    },
    { aborted: false },
    async () => {},
    async (id) => ({
      id,
      status: "succeeded",
      refund: { status: "succeeded" },
    }),
  );
  assert.equal(result.refundSucceeded, true);
});
test("requested refund remains requested until administrator processes it", async () => {
  const result = await reconcileAlipayReturn(
    async () => ({
      payments: [{ ...row("succeeded"), refund: { status: "requested" } }],
    }),
    async () => {
      throw Error("must not query payment");
    },
    { aborted: false },
    async () => {},
    async () => {
      throw Error("must not submit refund");
    },
  );
  assert.equal(result.refundSucceeded, false);
});
test("native AbortSignal without browser throwIfAborted is supported", async () => {
  await reconcileAlipayReturn(
    async () => ({ payments: [] }),
    async () => row(),
    { aborted: false },
  );
});
test("return reads newly created server payment instead of pre-wallet empty snapshot", async () => {
  const calls = [];
  await reconcileAlipayReturn(
    async () => {
      calls.push("read");
      return { payments: [row()] };
    },
    async (id) => {
      calls.push(id);
      return row("succeeded");
    },
    new AbortController().signal,
  );
  assert.deepEqual(calls, ["read", "new-payment"]);
});
test("server pending is checked with bounded waits; only verified success settles", async () => {
  let count = 0;
  const waits = [];
  await reconcileAlipayReturn(
    async () => ({ payments: [row()] }),
    async () => row(++count === 3 ? "succeeded" : "pending"),
    new AbortController().signal,
    async (ms) => {
      waits.push(ms);
    },
  );
  assert.equal(count, 3);
  assert.deepEqual(waits, [800, 1600]);
});
test("cancelled wallet leaves pending; no automatic creation, success or close", async () => {
  let queries = 0;
  await reconcileAlipayReturn(
    async () => ({ payments: [row()] }),
    async () => {
      queries++;
      return row();
    },
    new AbortController().signal,
    async () => {},
  );
  assert.equal(queries, 3);
});
test("terminal records are not queried; failures and navigation cancellation remain visible", async () => {
  await reconcileAlipayReturn(
    async () => ({ payments: [row("succeeded"), row("closed")] }),
    async () => {
      throw Error("must not query terminal");
    },
    new AbortController().signal,
  );
  await assert.rejects(
    reconcileAlipayReturn(
      async () => ({ payments: [row()] }),
      async () => {
        throw Error("offline");
      },
      new AbortController().signal,
    ),
    /offline/,
  );
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    reconcileAlipayReturn(
      async () => ({ payments: [row()] }),
      async () => {
        throw Error("must not query");
      },
      controller.signal,
    ),
  );
});

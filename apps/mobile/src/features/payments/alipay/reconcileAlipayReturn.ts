import type { AlipaySandboxPaymentRecord } from "@device-service-hub/contracts";

/** Read the current server list, never the stale list captured before opening the wallet. */
export async function reconcileAlipayReturn(
  read: () => Promise<{ payments: AlipaySandboxPaymentRecord[] }>,
  query: (id: string) => Promise<AlipaySandboxPaymentRecord>,
  signal: AbortSignal,
  wait: (ms: number) => Promise<void> = (ms) =>
    new Promise((resolve) => setTimeout(resolve, ms)),
  queryRefund?: (id: string) => Promise<AlipaySandboxPaymentRecord>,
) {
  const snapshot = await read();
  let refundSucceeded = snapshot.payments.some(
    (p) => p.refund?.status === "succeeded",
  );
  for (const payment of snapshot.payments.filter(
    (p) => p.status === "pending",
  )) {
    for (let attempt = 0; attempt < 3; attempt++) {
      if (signal.aborted) throw new Error("支付核验已取消");
      const verified = await query(payment.id);
      if (verified.status !== "pending") break;
      if (attempt < 2) await wait(800 * (attempt + 1));
    }
  }
  for (const payment of snapshot.payments.filter(
    (p) => p.refund?.status === "processing",
  )) {
    if (signal.aborted) throw new Error("退款核验已取消");
    if (queryRefund) {
      const verified = await queryRefund(payment.id);
      refundSucceeded ||= verified.refund?.status === "succeeded";
    }
  }
  if (signal.aborted) throw new Error("支付核验已取消");
  return { refundSucceeded };
}

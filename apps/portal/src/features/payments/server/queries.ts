import "server-only";
import type { PaymentRecord } from "@device-service-hub/contracts";
import { reporterGet } from "../../auth/server/resources";
export async function getMyPayments(orderId: string) {
  const response = await reporterGet<{ payments: PaymentRecord[] }>(
    `/orders/${encodeURIComponent(orderId)}/payments`,
  );
  return response.payments;
}

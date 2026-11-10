import type {
  CreateMockPaymentInput,
  PaymentRecord,
} from "@device-service-hub/contracts";
import { clientPost } from "../../shared/api/http";
export function createMockPayment(
  orderId: string,
  input: CreateMockPaymentInput,
  signal: AbortSignal,
) {
  return clientPost<PaymentRecord>(
    `/api/orders/${encodeURIComponent(orderId)}/payments`,
    input,
    signal,
  );
}

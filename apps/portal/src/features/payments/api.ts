import type {
  CreateMockPaymentInput,
  PaymentRecord,
  RequestMockRefundInput,
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

export function confirmMockPayment(
  orderId: string,
  paymentId: string,
  signal: AbortSignal,
) {
  return clientPost<PaymentRecord>(
    `/api/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}/mock-success`,
    {},
    signal,
  );
}

export function requestMockRefund(
  orderId: string,
  paymentId: string,
  input: RequestMockRefundInput,
  signal: AbortSignal,
) {
  return clientPost<PaymentRecord>(
    `/api/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}/refund`,
    input,
    signal,
  );
}

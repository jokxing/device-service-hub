import type {
  CreateMockPaymentInput,
  PaymentRecord,
  RequestMockRefundInput,
} from "@device-service-hub/contracts";
import type {
  AuthenticatedRead,
  AuthenticatedPost,
} from "../../shared/api/http";
export const readMyPayments = (
  request: AuthenticatedRead,
  orderId: string,
  signal?: AbortSignal,
) =>
  request<{ payments: PaymentRecord[] }>(
    `/mobile/orders/${encodeURIComponent(orderId)}/payments`,
    signal,
  );
export const createMockPayment = (
  post: AuthenticatedPost,
  orderId: string,
  input: CreateMockPaymentInput,
  signal?: AbortSignal,
) =>
  post<PaymentRecord>(
    `/mobile/orders/${encodeURIComponent(orderId)}/payments`,
    input,
    signal,
  );
export const confirmMockPayment = (
  post: AuthenticatedPost,
  orderId: string,
  paymentId: string,
  signal?: AbortSignal,
) =>
  post<PaymentRecord>(
    `/mobile/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}/mock-success`,
    undefined,
    signal,
  );

export const requestMockRefund = (
  post: AuthenticatedPost,
  orderId: string,
  paymentId: string,
  input: RequestMockRefundInput,
  signal?: AbortSignal,
) =>
  post<PaymentRecord>(
    `/mobile/orders/${encodeURIComponent(orderId)}/payments/${encodeURIComponent(paymentId)}/refund`,
    input,
    signal,
  );

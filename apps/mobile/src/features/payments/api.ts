import type {
  PaymentRecord,
  RequestMockRefundInput,
} from "@device-service-hub/contracts";
import type {
  AuthenticatedRead,
  AuthenticatedPost,
} from "../../shared/api/http";
export interface MyPaymentsSnapshot {
  payments: PaymentRecord[];
  blockCancellation: boolean;
}
export const readMyPayments = async (
  request: AuthenticatedRead,
  orderId: string,
  signal?: AbortSignal,
) => {
  const result = await request<MyPaymentsSnapshot>(
    `/mobile/orders/${encodeURIComponent(orderId)}/payments`,
    signal,
  );
  return { ...result, blockCancellation: result.blockCancellation !== false };
};
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

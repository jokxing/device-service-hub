import type {
  AlipaySandboxAppCheckout,
  AlipaySandboxPaymentRecord,
  CreateAlipaySandboxInput,
  RequestAlipaySandboxRefundInput,
} from "@device-service-hub/contracts";
import type {
  AuthenticatedRead,
  AuthenticatedPost,
} from "../../../shared/api/http";
const route = (id: string) =>
  `/mobile/orders/${encodeURIComponent(id)}/alipay-sandbox`;
export const readAlipayPayments = (
  read: AuthenticatedRead,
  id: string,
  signal?: AbortSignal,
) =>
  read<{ enabled: boolean; payments: AlipaySandboxPaymentRecord[] }>(
    route(id),
    signal,
  );
export const createAppPayment = (
  post: AuthenticatedPost,
  id: string,
  input: CreateAlipaySandboxInput,
  signal?: AbortSignal,
) => post<AlipaySandboxAppCheckout>(route(id), input, signal);
export const continueAppPayment = (
  post: AuthenticatedPost,
  id: string,
  paymentId: string,
  signal?: AbortSignal,
) =>
  post<AlipaySandboxAppCheckout>(
    `${route(id)}/${encodeURIComponent(paymentId)}/checkout`,
    undefined,
    signal,
  );
export const queryAppPayment = (
  post: AuthenticatedPost,
  id: string,
  paymentId: string,
  signal?: AbortSignal,
) =>
  post<AlipaySandboxPaymentRecord>(
    `${route(id)}/${encodeURIComponent(paymentId)}/query`,
    undefined,
    signal,
  );
export const closeAppPayment = (
  post: AuthenticatedPost,
  id: string,
  paymentId: string,
  signal?: AbortSignal,
) =>
  post<AlipaySandboxPaymentRecord>(
    `${route(id)}/${encodeURIComponent(paymentId)}/close`,
    undefined,
    signal,
  );
export const requestAlipayRefund = (
  post: AuthenticatedPost,
  orderId: string,
  paymentId: string,
  input: RequestAlipaySandboxRefundInput,
  signal?: AbortSignal,
) =>
  post<AlipaySandboxPaymentRecord>(
    `${route(orderId)}/${encodeURIComponent(paymentId)}/refund`,
    input,
    signal,
  );
export const queryAlipayRefund = (
  post: AuthenticatedPost,
  orderId: string,
  paymentId: string,
  signal?: AbortSignal,
) =>
  post<AlipaySandboxPaymentRecord>(
    `${route(orderId)}/${encodeURIComponent(paymentId)}/refund/query`,
    undefined,
    signal,
  );

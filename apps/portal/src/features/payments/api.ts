import { clientPost } from "../../shared/api/http";
import type {
  AlipaySandboxCheckout,
  AlipaySandboxPaymentRecord,
  CreateAlipaySandboxInput,
  RequestAlipaySandboxRefundInput,
} from "@device-service-hub/contracts";
export function requestSandboxRefund(
  orderId: string,
  paymentId: string,
  input: RequestAlipaySandboxRefundInput,
  signal: AbortSignal,
) {
  return clientPost<AlipaySandboxPaymentRecord>(
    `/api/orders/${encodeURIComponent(orderId)}/alipay-sandbox/${encodeURIComponent(paymentId)}/refund`,
    input,
    signal,
  );
}
export function querySandboxRefund(
  orderId: string,
  paymentId: string,
  signal: AbortSignal,
) {
  return clientPost<AlipaySandboxPaymentRecord>(
    `/api/orders/${encodeURIComponent(orderId)}/alipay-sandbox/${encodeURIComponent(paymentId)}/refund/query`,
    {},
    signal,
  );
}
export function createSandboxPayment(
  orderId: string,
  input: CreateAlipaySandboxInput,
  signal: AbortSignal,
) {
  return clientPost<AlipaySandboxCheckout>(
    `/api/orders/${encodeURIComponent(orderId)}/alipay-sandbox`,
    input,
    signal,
  );
}
export function reopenSandboxPayment(
  orderId: string,
  paymentId: string,
  signal: AbortSignal,
) {
  return clientPost<AlipaySandboxCheckout>(
    `/api/orders/${encodeURIComponent(orderId)}/alipay-sandbox/${encodeURIComponent(paymentId)}/checkout`,
    {},
    signal,
  );
}
export function querySandboxPayment(
  orderId: string,
  paymentId: string,
  signal: AbortSignal,
) {
  return clientPost<AlipaySandboxPaymentRecord>(
    `/api/orders/${encodeURIComponent(orderId)}/alipay-sandbox/${encodeURIComponent(paymentId)}/query`,
    {},
    signal,
  );
}
export function closeSandboxPayment(
  orderId: string,
  paymentId: string,
  signal: AbortSignal,
) {
  return clientPost<AlipaySandboxPaymentRecord>(
    `/api/orders/${encodeURIComponent(orderId)}/alipay-sandbox/${encodeURIComponent(paymentId)}/close`,
    {},
    signal,
  );
}

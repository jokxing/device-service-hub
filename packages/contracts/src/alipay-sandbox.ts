export interface AlipaySandboxPaymentRecord {
  id: string;
  orderId: string;
  amountCents: number;
  status: "pending" | "closed" | "succeeded";
  createdAt: string;
  expiresAt: string;
  checkedAt: string | null;
  refund?: AlipaySandboxRefundRecord | null;
}
export interface AlipaySandboxRefundRecord {
  id: string;
  status: "requested" | "processing" | "succeeded";
  reason: string;
  amountCents: number;
  createdAt: string;
  submittedAt: string | null;
  checkedAt: string | null;
  succeededAt: string | null;
}
export interface RequestAlipaySandboxRefundInput extends CreateAlipaySandboxInput {
  reason: string;
}
export interface CreateAlipaySandboxInput {
  requestId: string;
}
export interface AlipaySandboxCheckout {
  payment: AlipaySandboxPaymentRecord;
  checkoutUrl: string | null;
}

-- PostgreSQL CHECK permits UNKNOWN; explicitly reject a missing closed reason.
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_closed_reason_required"
  CHECK ("status" <> 'closed' OR "closeReason" IS NOT NULL);

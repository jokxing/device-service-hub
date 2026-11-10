ALTER TABLE "PaymentAttempt" ADD COLUMN "succeededAt" TIMESTAMP(3);
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "PaymentAttempt_close_check";
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_close_check" CHECK (
  ("status"='pending' AND "closedAt" IS NULL AND "closeReason" IS NULL AND "succeededAt" IS NULL) OR
  ("status"='closed' AND "closedAt" IS NOT NULL AND "closeReason" IS NOT NULL AND "closeReason"='order_cancelled' AND "succeededAt" IS NULL) OR
  ("status"='succeeded' AND "closedAt" IS NULL AND "closeReason" IS NULL AND "succeededAt" IS NOT NULL)
);
CREATE UNIQUE INDEX "PaymentAttempt_one_success_per_order" ON "PaymentAttempt"("orderId") WHERE "status"='succeeded';

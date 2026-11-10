ALTER TABLE "PaymentAttempt" ADD COLUMN "expiresAt" TIMESTAMP(3);
-- Existing pending records receive a migration grace period; terminal records are unchanged.
UPDATE "PaymentAttempt" SET "expiresAt" = CASE WHEN "status"='pending' THEN (clock_timestamp() AT TIME ZONE 'UTC') + interval '15 minutes' ELSE "createdAt" + interval '15 minutes' END;
ALTER TABLE "PaymentAttempt" ALTER COLUMN "expiresAt" SET DEFAULT (CURRENT_TIMESTAMP + interval '15 minutes'), ALTER COLUMN "expiresAt" SET NOT NULL;
ALTER TABLE "PaymentAttempt" DROP CONSTRAINT "PaymentAttempt_close_check";
ALTER TABLE "PaymentAttempt" ADD CONSTRAINT "PaymentAttempt_close_check" CHECK (
("status"='pending' AND "closedAt" IS NULL AND "closeReason" IS NULL AND "succeededAt" IS NULL) OR
("status"='closed' AND "closedAt" IS NOT NULL AND "closeReason" IS NOT NULL AND "closeReason" IN ('order_cancelled','expired') AND "succeededAt" IS NULL) OR
("status"='succeeded' AND "closedAt" IS NULL AND "closeReason" IS NULL AND "succeededAt" IS NOT NULL));

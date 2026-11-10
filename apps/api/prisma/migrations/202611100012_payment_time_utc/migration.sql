-- Explicit UTC values for timestamp-without-time-zone, independent of session timezone.
ALTER TABLE "PaymentAttempt" ALTER COLUMN "createdAt" SET DEFAULT (clock_timestamp() AT TIME ZONE 'UTC'), ALTER COLUMN "expiresAt" SET DEFAULT ((clock_timestamp() AT TIME ZONE 'UTC') + interval '15 minutes');
-- Only the known erroneous pending window; keep terminal history and migration grace periods.
UPDATE "PaymentAttempt" SET "expiresAt"="createdAt"+interval '15 minutes'
WHERE "status"='pending' AND "expiresAt"-"createdAt" BETWEEN interval '8 hours 14 minutes 59 seconds' AND interval '8 hours 15 minutes 1 second';

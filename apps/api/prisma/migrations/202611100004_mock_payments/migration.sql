CREATE TYPE "PaymentChannel" AS ENUM ('mock');
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'closed');
CREATE TABLE "PaymentAttempt" (
  "id" TEXT NOT NULL,
  "number" SERIAL NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "requestId" UUID NOT NULL,
  "channel" "PaymentChannel" NOT NULL DEFAULT 'mock',
  "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
  "currency" CHAR(3) NOT NULL DEFAULT 'CNY',
  "amountCents" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "closedAt" TIMESTAMP(3),
  "closeReason" VARCHAR(30),
  CONSTRAINT "PaymentAttempt_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PaymentAttempt_amount_check" CHECK ("amountCents" > 0 AND "currency" = 'CNY'),
  CONSTRAINT "PaymentAttempt_close_check" CHECK (("status" = 'pending' AND "closedAt" IS NULL AND "closeReason" IS NULL) OR ("status" = 'closed' AND "closedAt" IS NOT NULL AND "closeReason" = 'order_cancelled')),
  CONSTRAINT "PaymentAttempt_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PaymentAttempt_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "PaymentAttempt_number_key" ON "PaymentAttempt"("number");
CREATE UNIQUE INDEX "PaymentAttempt_actorId_requestId_key" ON "PaymentAttempt"("actorId", "requestId");
CREATE UNIQUE INDEX "PaymentAttempt_one_pending_per_order" ON "PaymentAttempt"("orderId") WHERE "status" = 'pending';
CREATE INDEX "PaymentAttempt_orderId_createdAt_idx" ON "PaymentAttempt"("orderId", "createdAt");

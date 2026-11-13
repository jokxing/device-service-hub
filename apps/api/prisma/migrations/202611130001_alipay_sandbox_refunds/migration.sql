CREATE TYPE "AlipaySandboxRefundStatus" AS ENUM ('requested', 'processing', 'succeeded');
CREATE TABLE "AlipaySandboxRefund" (
  "id" TEXT NOT NULL,
  "paymentId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "requestId" UUID NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
  "status" "AlipaySandboxRefundStatus" NOT NULL DEFAULT 'requested',
  "handledById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT (clock_timestamp() AT TIME ZONE 'UTC'),
  "submittedAt" TIMESTAMP(3),
  "checkedAt" TIMESTAMP(3),
  "succeededAt" TIMESTAMP(3),
  CONSTRAINT "AlipaySandboxRefund_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "AlipaySandboxRefund_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "AlipaySandboxPayment"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AlipaySandboxRefund_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "AlipaySandboxRefund_handledById_fkey" FOREIGN KEY ("handledById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "AlipaySandboxRefund_paymentId_key" ON "AlipaySandboxRefund"("paymentId");
CREATE UNIQUE INDEX "AlipaySandboxRefund_actorId_requestId_key" ON "AlipaySandboxRefund"("actorId", "requestId");

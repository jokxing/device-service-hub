-- Additive only: existing mock payments and orders remain unchanged.
CREATE TABLE "AlipaySandboxPayment" (
 "id" TEXT NOT NULL PRIMARY KEY,
 "orderId" TEXT NOT NULL REFERENCES "ServiceOrder"("id") ON DELETE CASCADE,
 "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT,
 "requestId" UUID NOT NULL,
 "amountCents" INTEGER NOT NULL CHECK ("amountCents" > 0),
 "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
 "appId" TEXT NOT NULL,
 "sellerId" TEXT NOT NULL,
 "tradeNo" TEXT,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expiresAt" TIMESTAMP(3) NOT NULL,
 "checkedAt" TIMESTAMP(3)
);
CREATE UNIQUE INDEX "AlipaySandboxPayment_actorId_requestId_key" ON "AlipaySandboxPayment"("actorId", "requestId");
CREATE UNIQUE INDEX "AlipaySandboxPayment_tradeNo_key" ON "AlipaySandboxPayment"("tradeNo");
CREATE INDEX "AlipaySandboxPayment_orderId_createdAt_idx" ON "AlipaySandboxPayment"("orderId", "createdAt");
CREATE UNIQUE INDEX "AlipaySandboxPayment_one_active" ON "AlipaySandboxPayment"("orderId") WHERE "status" IN ('pending','succeeded');

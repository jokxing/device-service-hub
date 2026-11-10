CREATE TABLE "MockRefundRequest" (
"id" UUID PRIMARY KEY, "paymentId" TEXT NOT NULL UNIQUE, "actorId" TEXT NOT NULL, "requestId" UUID NOT NULL, "reason" VARCHAR(500) NOT NULL CHECK(length(btrim("reason"))>0), "amountCents" INTEGER NOT NULL CHECK("amountCents">0), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "MockRefundRequest_paymentId_fkey" FOREIGN KEY("paymentId") REFERENCES "PaymentAttempt"("id") ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT "MockRefundRequest_actorId_fkey" FOREIGN KEY("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX "MockRefundRequest_actorId_requestId_key" ON "MockRefundRequest"("actorId","requestId");

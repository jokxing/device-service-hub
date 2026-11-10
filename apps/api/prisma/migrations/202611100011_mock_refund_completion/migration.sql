CREATE TABLE "MockRefundCompletion" ("id" UUID PRIMARY KEY,"refundId" UUID NOT NULL UNIQUE,"actorId" TEXT NOT NULL,"requestId" UUID NOT NULL,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
CONSTRAINT "MockRefundCompletion_refundId_fkey" FOREIGN KEY("refundId") REFERENCES "MockRefundRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE,
CONSTRAINT "MockRefundCompletion_actorId_fkey" FOREIGN KEY("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE);
CREATE UNIQUE INDEX "MockRefundCompletion_actorId_requestId_key" ON "MockRefundCompletion"("actorId","requestId");

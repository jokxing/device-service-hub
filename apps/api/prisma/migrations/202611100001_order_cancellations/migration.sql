ALTER TYPE "ServiceOrderStatus" ADD VALUE 'cancelled';
CREATE TABLE "ServiceOrderCancellation" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "requestId" UUID NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceOrderCancellation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceOrderCancellation_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 1 AND 500),
  CONSTRAINT "ServiceOrderCancellation_version_check" CHECK ("expectedVersion" >= 0),
  CONSTRAINT "ServiceOrderCancellation_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ServiceOrderCancellation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceOrderCancellation_orderId_key" ON "ServiceOrderCancellation"("orderId");
CREATE UNIQUE INDEX "ServiceOrderCancellation_actorId_requestId_key" ON "ServiceOrderCancellation"("actorId", "requestId");

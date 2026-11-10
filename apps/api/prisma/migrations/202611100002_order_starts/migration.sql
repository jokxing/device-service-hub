ALTER TYPE "ServiceOrderStatus" ADD VALUE 'in_progress';
CREATE TABLE "ServiceOrderStart" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "requestId" UUID NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ServiceOrderStart_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ServiceOrderStart_version_check" CHECK ("expectedVersion" >= 0),
  CONSTRAINT "ServiceOrderStart_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "ServiceOrderStart_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ServiceOrderStart_orderId_key" ON "ServiceOrderStart"("orderId");
CREATE UNIQUE INDEX "ServiceOrderStart_actorId_requestId_key" ON "ServiceOrderStart"("actorId", "requestId");

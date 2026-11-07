CREATE TABLE "TicketPhoto" (
  "id" UUID NOT NULL,
  "ticketId" TEXT NOT NULL,
  "uploaderId" TEXT NOT NULL,
  "storageKey" TEXT NOT NULL,
  "inputHash" CHAR(64) NOT NULL,
  "width" INTEGER NOT NULL,
  "height" INTEGER NOT NULL,
  "bytes" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketPhoto_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketPhoto_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TicketPhoto_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TicketPhoto_storageKey_key" ON "TicketPhoto"("storageKey");
CREATE INDEX "TicketPhoto_ticketId_createdAt_idx" ON "TicketPhoto"("ticketId", "createdAt");

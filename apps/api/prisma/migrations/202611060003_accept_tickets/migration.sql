BEGIN;
CREATE TABLE "TicketAcceptance" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "requestId" UUID NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketAcceptance_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketAcceptance_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TicketAcceptance_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TicketAcceptance_ticketId_key" ON "TicketAcceptance"("ticketId");
CREATE UNIQUE INDEX "TicketAcceptance_actorId_requestId_key" ON "TicketAcceptance"("actorId", "requestId");
COMMIT;

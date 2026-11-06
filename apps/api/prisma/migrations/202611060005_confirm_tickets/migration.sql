BEGIN;
CREATE TABLE "TicketConfirmation" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "requestId" UUID NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketConfirmation_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketConfirmation_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TicketConfirmation_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TicketConfirmation_ticketId_key" ON "TicketConfirmation"("ticketId");
CREATE UNIQUE INDEX "TicketConfirmation_actorId_requestId_key" ON "TicketConfirmation"("actorId", "requestId");
COMMIT;

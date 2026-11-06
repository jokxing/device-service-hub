BEGIN;
CREATE TABLE "TicketResult" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "description" VARCHAR(2000) NOT NULL,
  "requestId" UUID NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketResult_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketResult_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TicketResult_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TicketResult_ticketId_key" ON "TicketResult"("ticketId");
CREATE UNIQUE INDEX "TicketResult_actorId_requestId_key" ON "TicketResult"("actorId", "requestId");
COMMIT;

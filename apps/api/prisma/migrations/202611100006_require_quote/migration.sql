-- Append an audit for direct -> quoted corrections; existing records are unchanged.
CREATE TABLE "TicketServiceModeChange" (
    "id" UUID NOT NULL,
    "ticketId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "requestId" UUID NOT NULL,
    "expectedVersion" INTEGER NOT NULL,
    "reason" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TicketServiceModeChange_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "TicketServiceModeChange_reason_check" CHECK (length(btrim("reason")) > 0),
    CONSTRAINT "TicketServiceModeChange_version_check" CHECK ("expectedVersion" >= 0)
);
CREATE UNIQUE INDEX "TicketServiceModeChange_ticketId_key" ON "TicketServiceModeChange"("ticketId");
CREATE UNIQUE INDEX "TicketServiceModeChange_actorId_requestId_key" ON "TicketServiceModeChange"("actorId", "requestId");
ALTER TABLE "TicketServiceModeChange" ADD CONSTRAINT "TicketServiceModeChange_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TicketServiceModeChange" ADD CONSTRAINT "TicketServiceModeChange_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

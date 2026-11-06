BEGIN;
ALTER TABLE "Ticket"
  ADD COLUMN "assigneeId" TEXT,
  ADD COLUMN "assignedAt" TIMESTAMP(3),
  ADD COLUMN "version" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_assigneeId_fkey"
  FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "Ticket_status_createdAt_id_idx" ON "Ticket"("status", "createdAt", "id");
CREATE INDEX "Ticket_assigneeId_idx" ON "Ticket"("assigneeId");
CREATE TABLE "TicketAssignment" (
  "id" TEXT NOT NULL,
  "ticketId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "assigneeId" TEXT NOT NULL,
  "requestId" UUID NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TicketAssignment_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "TicketAssignment_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TicketAssignment_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "TicketAssignment_assigneeId_fkey" FOREIGN KEY ("assigneeId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "TicketAssignment_ticketId_key" ON "TicketAssignment"("ticketId");
CREATE UNIQUE INDEX "TicketAssignment_actorId_requestId_key" ON "TicketAssignment"("actorId", "requestId");
CREATE INDEX "TicketAssignment_assigneeId_idx" ON "TicketAssignment"("assigneeId");
COMMIT;

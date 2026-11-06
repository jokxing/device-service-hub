BEGIN;
CREATE TYPE "TicketStatus" AS ENUM ('pending', 'assigned', 'processing', 'confirming', 'completed', 'cancelled');
CREATE TYPE "TicketPriority" AS ENUM ('normal', 'urgent');
CREATE TABLE "Ticket" (
  "id" TEXT NOT NULL,
  "number" SERIAL NOT NULL,
  "reporterId" TEXT NOT NULL,
  "deviceId" TEXT NOT NULL,
  "title" VARCHAR(60) NOT NULL,
  "description" VARCHAR(500) NOT NULL,
  "priority" "TicketPriority" NOT NULL,
  "status" "TicketStatus" NOT NULL DEFAULT 'pending',
  "requestId" UUID NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Ticket_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "Ticket_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "Device"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Ticket_number_key" ON "Ticket"("number");
CREATE UNIQUE INDEX "Ticket_reporterId_requestId_key" ON "Ticket"("reporterId", "requestId");
CREATE INDEX "Ticket_reporterId_createdAt_id_idx" ON "Ticket"("reporterId", "createdAt", "id");
CREATE INDEX "Ticket_deviceId_idx" ON "Ticket"("deviceId");
COMMIT;

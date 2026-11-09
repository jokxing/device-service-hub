BEGIN;
CREATE TYPE "TicketServiceMode" AS ENUM ('direct', 'quoted');
CREATE TYPE "QuoteStatus" AS ENUM ('pending');
ALTER TABLE "Ticket" ADD COLUMN "serviceMode" "TicketServiceMode" NOT NULL DEFAULT 'direct';
ALTER TABLE "TicketAssignment" ADD COLUMN "serviceMode" "TicketServiceMode" NOT NULL DEFAULT 'direct';

CREATE TABLE "TicketQuote" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "ticketId" TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "revision" INTEGER NOT NULL CHECK ("revision" > 0),
  "status" "QuoteStatus" NOT NULL DEFAULT 'pending',
  "currency" CHAR(3) NOT NULL DEFAULT 'CNY' CHECK ("currency" = 'CNY'),
  "totalCents" INTEGER NOT NULL CHECK ("totalCents" BETWEEN 1 AND 100000000),
  "requestId" UUID NOT NULL,
  "requestHash" CHAR(64) NOT NULL,
  "expectedVersion" INTEGER NOT NULL CHECK ("expectedVersion" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "TicketQuote_ticketId_revision_key" ON "TicketQuote"("ticketId", "revision");
CREATE UNIQUE INDEX "TicketQuote_actorId_requestId_key" ON "TicketQuote"("actorId", "requestId");

CREATE TABLE "QuoteItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "quoteId" TEXT NOT NULL REFERENCES "TicketQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "position" INTEGER NOT NULL CHECK ("position" BETWEEN 0 AND 19),
  "name" VARCHAR(60) NOT NULL CHECK (char_length(trim("name")) > 0),
  "quantity" INTEGER NOT NULL CHECK ("quantity" BETWEEN 1 AND 999),
  "unitPriceCents" INTEGER NOT NULL CHECK ("unitPriceCents" BETWEEN 0 AND 10000000),
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" BETWEEN 0 AND 100000000 AND "amountCents"::bigint = "quantity"::bigint * "unitPriceCents"),
  "note" VARCHAR(200) NOT NULL
);
CREATE UNIQUE INDEX "QuoteItem_quoteId_position_key" ON "QuoteItem"("quoteId", "position");
COMMIT;

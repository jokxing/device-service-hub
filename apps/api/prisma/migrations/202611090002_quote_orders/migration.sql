ALTER TYPE "QuoteStatus" ADD VALUE 'accepted';

BEGIN;
CREATE TYPE "ServiceOrderStatus" AS ENUM ('awaiting_start');
CREATE TABLE "ServiceOrder" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "number" SERIAL NOT NULL,
  "ticketId" TEXT NOT NULL REFERENCES "Ticket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "quoteId" TEXT NOT NULL REFERENCES "TicketQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "quoteRevision" INTEGER NOT NULL CHECK ("quoteRevision" > 0),
  "status" "ServiceOrderStatus" NOT NULL DEFAULT 'awaiting_start',
  "currency" CHAR(3) NOT NULL DEFAULT 'CNY' CHECK ("currency" = 'CNY'),
  "totalCents" INTEGER NOT NULL CHECK ("totalCents" BETWEEN 1 AND 100000000),
  "actorId" TEXT NOT NULL REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requestId" UUID NOT NULL,
  "expectedVersion" INTEGER NOT NULL CHECK ("expectedVersion" >= 0),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "ServiceOrder_number_key" ON "ServiceOrder"("number");
CREATE UNIQUE INDEX "ServiceOrder_ticketId_key" ON "ServiceOrder"("ticketId");
CREATE UNIQUE INDEX "ServiceOrder_quoteId_key" ON "ServiceOrder"("quoteId");
CREATE UNIQUE INDEX "ServiceOrder_actorId_requestId_key" ON "ServiceOrder"("actorId", "requestId");
CREATE TABLE "ServiceOrderItem" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "orderId" TEXT NOT NULL REFERENCES "ServiceOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "position" INTEGER NOT NULL CHECK ("position" BETWEEN 0 AND 19),
  "name" VARCHAR(60) NOT NULL CHECK (char_length(trim("name")) > 0),
  "quantity" INTEGER NOT NULL CHECK ("quantity" BETWEEN 1 AND 999),
  "unitPriceCents" INTEGER NOT NULL CHECK ("unitPriceCents" BETWEEN 0 AND 10000000),
  "amountCents" INTEGER NOT NULL CHECK ("amountCents" BETWEEN 0 AND 100000000 AND "amountCents"::bigint = "quantity"::bigint * "unitPriceCents"),
  "note" VARCHAR(200) NOT NULL
);
CREATE UNIQUE INDEX "ServiceOrderItem_orderId_position_key" ON "ServiceOrderItem"("orderId", "position");
COMMIT;

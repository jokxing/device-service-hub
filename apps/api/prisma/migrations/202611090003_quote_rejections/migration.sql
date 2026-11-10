ALTER TYPE "QuoteStatus" ADD VALUE 'rejected';

CREATE TABLE "QuoteRejection" (
  "id" TEXT NOT NULL,
  "quoteId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "reason" VARCHAR(500) NOT NULL,
  "requestId" UUID NOT NULL,
  "expectedVersion" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "QuoteRejection_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "QuoteRejection_reason_check" CHECK (char_length(btrim("reason")) BETWEEN 1 AND 500),
  CONSTRAINT "QuoteRejection_version_check" CHECK ("expectedVersion" >= 0),
  CONSTRAINT "QuoteRejection_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "TicketQuote"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "QuoteRejection_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "QuoteRejection_quoteId_key" ON "QuoteRejection"("quoteId");
CREATE UNIQUE INDEX "QuoteRejection_actorId_requestId_key" ON "QuoteRejection"("actorId", "requestId");

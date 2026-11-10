import type { QuoteRecord } from "@device-service-hub/contracts";
import type { Prisma } from "../../../generated/prisma/client";
import type { QUOTE_SELECT } from "../quotes.select";

type QuoteRow = Prisma.TicketQuoteGetPayload<{ select: typeof QUOTE_SELECT }>;
export function toQuoteRecord(quote: QuoteRow): QuoteRecord {
  return {
    ...quote,
    currency: "CNY",
    createdAt: quote.createdAt.toISOString(),
    rejection: quote.rejection
      ? {
          ...quote.rejection,
          createdAt: quote.rejection.createdAt.toISOString(),
        }
      : null,
  };
}

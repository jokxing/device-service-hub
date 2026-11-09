import type {
  QuoteRecord,
  ReporterTicketRecord,
} from "@device-service-hub/contracts";

export type QuoteActionTicket = Pick<
  ReporterTicketRecord,
  "id" | "code" | "title" | "version" | "status" | "serviceMode" | "result"
>;
export type ConfirmationQuote = Pick<
  QuoteRecord,
  "id" | "revision" | "status" | "totalCents"
>;

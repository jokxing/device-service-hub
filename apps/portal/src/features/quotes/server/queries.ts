import "server-only";
import type { QuoteRecord } from "@device-service-hub/contracts";
import { reporterGet } from "../../auth/server/resources";

export async function getMyQuote(ticketId: string) {
  const response = await reporterGet<{ quote: QuoteRecord | null }>(
    `/tickets/${encodeURIComponent(ticketId)}/quote`,
  );
  return response.quote;
}

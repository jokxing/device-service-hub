import "server-only";
import type { QuoteRecord } from "@device-service-hub/contracts";
import { reporterGet } from "../../auth/server/resources";

export async function getMyQuotes(ticketId: string) {
  const response = await reporterGet<{ quotes: QuoteRecord[] }>(
    `/tickets/${encodeURIComponent(ticketId)}/quote/history`,
  );
  return response.quotes;
}

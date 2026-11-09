import "server-only";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { reporterGet } from "../../auth/server/resources";

export async function getMyOrder(ticketId: string) {
  const response = await reporterGet<{ order: ServiceOrderRecord | null }>(
    `/orders/by-ticket/${encodeURIComponent(ticketId)}`,
  );
  return response.order;
}

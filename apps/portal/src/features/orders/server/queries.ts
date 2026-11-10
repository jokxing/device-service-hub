import "server-only";
import type {
  ServiceOrderRecord,
  ServiceOrderPage,
  ServiceOrderDetail,
} from "@device-service-hub/contracts";
import { orderListQuery } from "@device-service-hub/contracts/order-rules";
import { reporterGet } from "../../auth/server/resources";

export function getMyOrders(
  page: number,
  status?: ServiceOrderRecord["status"],
) {
  return reporterGet<ServiceOrderPage>(
    `/orders?${orderListQuery(page, status)}`,
  );
}
export function getMyOrderDetail(id: string) {
  return reporterGet<ServiceOrderDetail>(`/orders/${encodeURIComponent(id)}`);
}

export async function getMyOrder(ticketId: string) {
  const response = await reporterGet<{ order: ServiceOrderRecord | null }>(
    `/orders/by-ticket/${encodeURIComponent(ticketId)}`,
  );
  return response.order;
}

import type {
  CancelOrderInput,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { clientPost } from "../../shared/api/http";

export function cancelOrder(
  orderId: string,
  input: CancelOrderInput,
  signal: AbortSignal,
) {
  return clientPost<ServiceOrderRecord>(
    `/api/orders/${encodeURIComponent(orderId)}/cancel`,
    input,
    signal,
  );
}

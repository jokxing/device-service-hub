import { useSearchParams } from "react-router-dom";
import { useCallback } from "react";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import {
  readOrderStatus,
  orderListQuery,
} from "@device-service-hub/contracts/order-rules";
import { readPage } from "../../shared/utils/pagination";

export function useOrderListQuery() {
  const [params, setParams] = useSearchParams();
  const page = readPage(params.get("page"));
  const status = readOrderStatus(params.get("status"));
  const setPage = useCallback(
    (next: number) => setParams(orderListQuery(next, status)),
    [setParams, status],
  );
  const replacePage = useCallback(
    (next: number) =>
      setParams(orderListQuery(next, status), { replace: true }),
    [setParams, status],
  );
  const setStatus = useCallback(
    (next?: ServiceOrderRecord["status"]) => setParams(orderListQuery(1, next)),
    [setParams],
  );
  return {
    page,
    status,
    search: orderListQuery(page, status),
    setPage,
    replacePage,
    setStatus,
  };
}

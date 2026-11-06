import { useSearchParams } from "react-router-dom";
import type { TicketStatus } from "@device-service-hub/contracts";
import { readPage } from "../../../shared/utils/pagination";
import { STATUS_OPTIONS } from "../constants";

function listSearch(page: number, status?: TicketStatus): URLSearchParams {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (page > 1) query.set("page", String(page));
  return query;
}

export function useTicketListQuery() {
  const [params, setParams] = useSearchParams();
  const page = readPage(params.get("page"));
  const status = STATUS_OPTIONS.find(
    (option) => option.value === params.get("status"),
  )?.value;
  return {
    page,
    status,
    setPage: (next: number) => setParams(listSearch(next, status)),
    setStatus: (next?: TicketStatus) => setParams(listSearch(1, next)),
  };
}

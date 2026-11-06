import { useCallback } from "react";
import { useNativeSession } from "../auth/sessionContext";
import { useApiResource } from "../../shared/hooks/useApiResource";
import { getMyTicket, listMyTickets } from "./api";
export function useMyTickets(page: number) {
  const { request } = useNativeSession();
  return useApiResource(
    useCallback(
      (signal: AbortSignal) => listMyTickets(request, page, signal),
      [request, page],
    ),
  );
}
export function useMyTicket(id: string) {
  const { request } = useNativeSession();
  return useApiResource(
    useCallback(
      (signal: AbortSignal) => getMyTicket(request, id, signal),
      [request, id],
    ),
  );
}

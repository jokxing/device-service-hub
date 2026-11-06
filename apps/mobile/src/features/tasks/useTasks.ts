import { useCallback } from "react";
import type { TicketStatus } from "@device-service-hub/contracts";
import { useNativeSession } from "../auth/sessionContext";
import { useApiResource } from "../../shared/hooks/useApiResource";
import { getTask, listTasks } from "./api";
export function useTasks(page: number, status?: TicketStatus) {
  const { request } = useNativeSession();
  return useApiResource(
    useCallback(
      (signal: AbortSignal) => listTasks(request, page, status, signal),
      [request, page, status],
    ),
  );
}
export function useTask(id: string) {
  const { request } = useNativeSession();
  return useApiResource(
    useCallback(
      (signal: AbortSignal) => getTask(request, id, signal),
      [request, id],
    ),
  );
}

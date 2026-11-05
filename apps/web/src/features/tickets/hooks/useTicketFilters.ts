import { useSearchParams } from "react-router-dom";
import { STATUS_META } from "../constants";
import type { Priority, Status, TicketFilters, TicketTab } from "../types";

const isStatus = (value: string): value is Status =>
  Object.hasOwn(STATUS_META, value);
const isTab = (value: string): value is TicketTab =>
  value === "all" || value === "active" || isStatus(value);

/** URL state supports direct links and back/forward without synchronization effects. */
export function useTicketFilters() {
  const [params, setParams] = useSearchParams();
  const rawTab = params.get("tab") ?? "all";
  const rawStatus = params.get("status") ?? "";
  const rawPriority = params.get("priority");
  const rawPage = Number(params.get("page") ?? 1);
  const filters: TicketFilters = {
    query: params.get("q") ?? "",
    tab: isTab(rawTab) ? rawTab : "all",
    status: isStatus(rawStatus) ? rawStatus : undefined,
    priority:
      rawPriority === "normal" || rawPriority === "urgent"
        ? (rawPriority as Priority)
        : undefined,
    page: Number.isSafeInteger(rawPage) && rawPage > 0 ? rawPage : 1,
  };
  function updateFilters(patch: Partial<TicketFilters>) {
    const next = new URLSearchParams(params);
    const keys = {
      query: "q",
      tab: "tab",
      status: "status",
      priority: "priority",
      page: "page",
    } as const;
    for (const key of Object.keys(patch) as (keyof TicketFilters)[]) {
      const value = patch[key];
      if (
        value === undefined ||
        value === "" ||
        value === "all" ||
        (key === "page" && value === 1)
      )
        next.delete(keys[key]);
      else next.set(keys[key], String(value));
    }
    if (!Object.hasOwn(patch, "page")) next.delete("page");
    setParams(next, { replace: Object.hasOwn(patch, "query") });
  }
  function resetFilters() {
    setParams({});
  }
  return { filters, updateFilters, resetFilters };
}

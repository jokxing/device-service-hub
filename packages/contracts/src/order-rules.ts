export const ORDER_LIMITS = { cancellationReason: 500 } as const;
export const ORDER_STATUSES = [
  "awaiting_start",
  "in_progress",
  "awaiting_confirmation",
  "completed",
  "cancelled",
] as const;
export const ORDER_PAGINATION = {
  defaultSize: 10,
  maxSize: 50,
  maxPage: 100000,
} as const;
export function readOrderStatus(value: unknown) {
  return ORDER_STATUSES.find((status) => status === value);
}
export function orderListQuery(
  page: number,
  status?: (typeof ORDER_STATUSES)[number],
) {
  const query = new URLSearchParams();
  if (status) query.set("status", status);
  if (page > 1) query.set("page", String(page));
  return query.toString();
}

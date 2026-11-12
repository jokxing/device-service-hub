import type {
  ServiceOrderRecord,
  TaskTicketRecord,
} from "@device-service-hub/contracts";
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

/** Display eligibility only; API independently checks current assignee and state. */
export function canSubmitOrderResult(
  task: TaskTicketRecord,
  order: ServiceOrderRecord,
) {
  return (
    task.id === order.ticketId &&
    task.serviceMode === "quoted" &&
    task.status === "processing" &&
    !!task.acceptance &&
    !task.result &&
    !task.confirmation &&
    order.status === "in_progress" &&
    !!order.start &&
    !order.cancellation
  );
}

export function canStartOrder(
  task: TaskTicketRecord,
  order: ServiceOrderRecord,
) {
  return (
    task.id === order.ticketId &&
    task.serviceMode === "quoted" &&
    task.status === "processing" &&
    !!task.acceptance &&
    !task.result &&
    !task.confirmation &&
    order.status === "awaiting_start" &&
    !order.start &&
    !order.cancellation
  );
}

/** UI eligibility only; the service also checks ownership and payment state. */
export function canCancelOrder(
  ticket: Pick<
    TaskTicketRecord,
    "id" | "serviceMode" | "status" | "result" | "confirmation"
  >,
  order: Pick<ServiceOrderRecord, "ticketId" | "status" | "cancellation">,
) {
  return (
    ticket.id === order.ticketId &&
    ticket.serviceMode === "quoted" &&
    ticket.status === "processing" &&
    !ticket.result &&
    !ticket.confirmation &&
    order.status === "awaiting_start" &&
    !order.cancellation
  );
}

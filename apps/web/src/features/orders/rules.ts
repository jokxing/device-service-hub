import type {
  ServiceOrderRecord,
  TaskTicketRecord,
} from "@device-service-hub/contracts";

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

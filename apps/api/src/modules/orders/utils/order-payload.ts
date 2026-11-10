import type {
  ServiceOrderRecord,
  ServiceOrderSummary,
  ServiceOrderDetail,
} from "@device-service-hub/contracts";
import type { Prisma } from "../../../generated/prisma/client";
import type {
  ORDER_SELECT,
  ORDER_LIST_SELECT,
  ORDER_DETAIL_SELECT,
} from "../orders.select";
import {
  toTicketCode,
  toTicketRecord,
} from "../../tickets/utils/ticket-payload";

function orderCode(number: number) {
  return `SO-${String(number).padStart(6, "0")}`;
}

export function toOrderRecord(
  row: Prisma.ServiceOrderGetPayload<{ select: typeof ORDER_SELECT }>,
): ServiceOrderRecord {
  const { number, createdAt, cancellation, start, ...record } = row;
  return {
    ...record,
    code: orderCode(number),
    currency: "CNY",
    createdAt: createdAt.toISOString(),
    start: start
      ? { ...start, createdAt: start.createdAt.toISOString() }
      : null,
    cancellation: cancellation
      ? { ...cancellation, createdAt: cancellation.createdAt.toISOString() }
      : null,
  };
}

export function toOrderSummary(
  row: Prisma.ServiceOrderGetPayload<{ select: typeof ORDER_LIST_SELECT }>,
): ServiceOrderSummary {
  const { number, createdAt, ticket, ...record } = row;
  return {
    ...record,
    currency: "CNY",
    code: orderCode(number),
    createdAt: createdAt.toISOString(),
    ticket: {
      code: toTicketCode(ticket.number),
      title: ticket.title,
      device: ticket.device,
    },
  };
}

export function toOrderDetail(
  row: Prisma.ServiceOrderGetPayload<{ select: typeof ORDER_DETAIL_SELECT }>,
): ServiceOrderDetail {
  const { ticket, ...order } = row;
  return { ...toOrderRecord(order), ticket: toTicketRecord(ticket) };
}

import type {
  TicketStatus,
  TicketPriority,
} from "@device-service-hub/contracts";
export const TICKET_LIMITS = { title: 60, description: 500 } as const;
export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: "待分派",
  assigned: "待接单",
  processing: "处理中",
  confirming: "待确认",
  completed: "已完成",
  cancelled: "已取消",
};
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  normal: "普通",
  urgent: "紧急",
};

import type {
  TicketPriority,
  TicketStatus,
} from "@device-service-hub/contracts";
export const TICKET_LIMITS = { title: 60, description: 500 } as const;
export const PAGE_SIZE = 10;
export const PRIORITY_LABELS: Record<TicketPriority, string> = {
  normal: "普通",
  urgent: "紧急",
};
export const STATUS_LABELS: Record<TicketStatus, string> = {
  pending: "待分派",
  assigned: "待接单",
  processing: "处理中",
  confirming: "待确认",
  completed: "已完成",
  cancelled: "已取消",
};
export const STATUS_MESSAGES: Record<TicketStatus, string> = {
  pending: "报修已提交，等待管理员分派",
  assigned: "已分派维修人员，等待接单",
  processing: "维修人员已接单，正在处理中",
  confirming: "处理结果已提交，请核对后确认完成",
  completed: "报修用户已确认完成，工单已结束",
  cancelled: "工单已取消",
};

import type { FilePolicy } from "../../shared/utils/file";
import type { Priority, Status, TicketNoteKind, TicketTab } from "./types";

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  pending: { label: "待分派", color: "orange" },
  assigned: { label: "待接单", color: "blue" },
  processing: { label: "处理中", color: "cyan" },
  confirming: { label: "待确认", color: "purple" },
  completed: { label: "已完成", color: "green" },
  cancelled: { label: "已取消", color: "default" },
};
export const STATUS_OPTIONS = (Object.keys(STATUS_META) as Status[]).map(
  (value) => ({ value, label: STATUS_META[value].label }),
);
export const PRIORITY_LABELS: Record<Priority, string> = {
  normal: "普通",
  urgent: "紧急",
};
export const PRIORITY_OPTIONS = (
  Object.keys(PRIORITY_LABELS) as Priority[]
).map((value) => ({ value, label: PRIORITY_LABELS[value] }));
export const TICKET_TABS: { key: TicketTab; name: string }[] = [
  { key: "all", name: "全部工单" },
  ...(
    ["pending", "assigned", "processing", "confirming", "completed"] as const
  ).map((key) => ({ key, name: STATUS_META[key].label })),
];
export const TICKET_LIMITS = {
  title: 60,
  description: 500,
  attachments: 3,
} as const;
export const TICKET_PAGE_SIZE = 6;
export const ATTACHMENT_POLICY: FilePolicy = {
  allowedTypes: ["image/jpeg", "image/png", "image/webp"],
  maxSizeBytes: 5 * 1024 * 1024,
};
export const TICKET_NOTE_META: Record<
  TicketNoteKind,
  {
    title: string;
    field: string;
    placeholder: string;
    okText: string;
    nextStatus: Status;
  }
> = {
  result: {
    title: "提交处理结果",
    field: "处理结果",
    placeholder: "请说明故障原因、处理过程及结果",
    okText: "提交待确认",
    nextStatus: "confirming",
  },
  cancel: {
    title: "取消工单",
    field: "操作原因",
    placeholder: "请填写原因，记录将展示在处理时间线中",
    okText: "确认",
    nextStatus: "cancelled",
  },
  return: {
    title: "退回分派",
    field: "操作原因",
    placeholder: "请填写原因，记录将展示在处理时间线中",
    okText: "确认",
    nextStatus: "pending",
  },
  reject: {
    title: "反馈未解决的问题",
    field: "操作原因",
    placeholder: "请填写未解决的问题",
    okText: "确认",
    nextStatus: "processing",
  },
};

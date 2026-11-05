export type Status =
  | "pending"
  | "assigned"
  | "processing"
  | "confirming"
  | "completed"
  | "cancelled";
export type Priority = "normal" | "urgent";
export type TicketTab = "all" | "active" | Status;
export type TicketListMode = "all" | "completed";

export interface TicketEvent {
  title: string;
  time: string;
  detail: string;
}
export interface Ticket {
  id: string;
  title: string;
  deviceId: string;
  reporter: string;
  assignee?: string;
  status: Status;
  priority: Priority;
  created: string;
  description: string;
  events: TicketEvent[];
  attachments?: string[];
}
export interface CreateTicketValues {
  deviceId: string;
  title: string;
  description: string;
  priority: Priority;
}
export interface TicketFilters {
  query: string;
  tab: TicketTab;
  status?: Status;
  priority?: Priority;
  page: number;
}
export interface TicketCounts {
  pending: number;
  processing: number;
  confirming: number;
  completed: number;
}
export type TicketNoteKind = "result" | "cancel" | "return" | "reject";

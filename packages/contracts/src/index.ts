/** Transport types only. Never export database entities, password hashes or sessions. */
export type Role = "admin" | "reporter" | "technician";
export interface PublicUser {
  id: string;
  username: string;
  name: string;
  role: Role;
}
export interface LoginInput {
  username: string;
  password: string;
}
export interface LoginResponse {
  user: PublicUser;
  expiresAt: string;
}
export interface SessionResponse {
  user: PublicUser;
}
export interface DeviceSummary {
  id: string;
  code: string;
  name: string;
  category: string;
  location: string;
  model: string;
  enabled: boolean;
}

export type TicketPriority = "normal" | "urgent";
export type TicketStatus =
  | "pending"
  | "assigned"
  | "processing"
  | "confirming"
  | "completed"
  | "cancelled";
export interface CreateTicketInput {
  requestId: string;
  deviceId: string;
  title: string;
  description: string;
  priority: TicketPriority;
}
export interface TicketRecord {
  id: string;
  code: string;
  title: string;
  description: string;
  priority: TicketPriority;
  status: TicketStatus;
  createdAt: string;
  device: Pick<DeviceSummary, "id" | "code" | "name" | "location">;
}
export interface TicketPage {
  items: TicketRecord[];
  total: number;
  page: number;
  pageSize: number;
}

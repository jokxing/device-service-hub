/** Transport types only. Never export ORM entities, password hashes or internal session records. */
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
/** Credential response for explicit native transport only; never cache in browser storage. */
export interface NativeLoginResponse extends LoginResponse {
  accessToken: string;
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

/** Versioned navigation messages only; never send credentials or trust client roles. */
export type ServiceNavigationRequest =
  | { version: 1; action: "sign-in" }
  | { version: 1; action: "open-device"; deviceId: string };

export type TicketPriority = "normal" | "urgent";
export type TicketServiceMode = "direct" | "quoted";
export interface QuoteItemInput {
  name: string;
  quantity: number;
  unitPriceCents: number;
  note: string;
}
export interface SubmitQuoteInput extends TicketCommandInput {
  items: QuoteItemInput[];
}
export interface ReviseQuoteInput extends SubmitQuoteInput {
  baseQuoteId: string;
  baseQuoteRevision: number;
}
export interface QuoteRecord {
  id: string;
  ticketId: string;
  revision: number;
  status: "pending" | "accepted" | "rejected";
  currency: "CNY";
  totalCents: number;
  createdAt: string;
  actor: TicketPerson;
  items: (QuoteItemInput & { amountCents: number })[];
  rejection: { reason: string; actor: TicketPerson; createdAt: string } | null;
}
export interface AcceptQuoteInput extends TicketCommandInput {
  quoteId: string;
  quoteRevision: number;
}
export interface RejectQuoteInput extends AcceptQuoteInput {
  reason: string;
}
export interface ServiceOrderRecord {
  id: string;
  code: string;
  ticketId: string;
  quoteId: string;
  quoteRevision: number;
  status:
    | "awaiting_start"
    | "cancelled"
    | "in_progress"
    | "awaiting_confirmation"
    | "completed";
  currency: "CNY";
  totalCents: number;
  createdAt: string;
  confirmedBy: TicketPerson;
  start: { actor: TicketPerson; createdAt: string } | null;
  cancellation: {
    reason: string;
    actor: TicketPerson;
    createdAt: string;
  } | null;
  items: (QuoteItemInput & { amountCents: number })[];
}
export interface CancelOrderInput extends TicketCommandInput {
  reason: string;
}
export type StartOrderInput = TicketCommandInput;
export interface CreateMockPaymentInput {
  requestId: string;
}
export interface PaymentRecord {
  id: string;
  code: string;
  orderId: string;
  channel: "mock";
  currency: "CNY";
  amountCents: number;
  status: "pending" | "closed";
  createdAt: string;
  closedAt: string | null;
  closeReason: "order_cancelled" | null;
}
export interface ServiceOrderSummary extends Pick<
  ServiceOrderRecord,
  | "id"
  | "code"
  | "ticketId"
  | "status"
  | "currency"
  | "totalCents"
  | "createdAt"
> {
  ticket: Pick<TicketRecord, "code" | "title" | "device">;
}
export interface ServiceOrderPage {
  items: ServiceOrderSummary[];
  page: number;
  pageSize: number;
  total: number;
}
export interface ServiceOrderDetail extends ServiceOrderRecord {
  ticket: TicketRecord;
}
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
  assignee: TicketPerson | null;
  assignedAt: string | null;
  acceptance: { actor: TicketPerson; createdAt: string } | null;
  confirmation: { actor: TicketPerson; createdAt: string } | null;
  result: {
    description: string;
    actor: TicketPerson;
    createdAt: string;
  } | null;
  device: Pick<DeviceSummary, "id" | "code" | "name" | "location">;
}
export interface TicketPerson {
  id: string;
  name: string;
}
export interface TicketCommandInput {
  requestId: string;
  expectedVersion: number;
}
export interface AssignTicketInput extends TicketCommandInput {
  assigneeId: string;
  serviceMode?: TicketServiceMode;
}
export interface RequireQuoteInput extends TicketCommandInput {
  reason: string;
}
export type AcceptTicketInput = TicketCommandInput;
export type ConfirmTicketInput = TicketCommandInput;
export interface ReporterTicketRecord extends TicketRecord {
  version: number;
  serviceMode: TicketServiceMode;
}
export interface SubmitTicketResultInput extends TicketCommandInput {
  description: string;
}
export interface TaskTicketRecord extends TicketRecord {
  version: number;
  serviceMode: TicketServiceMode;
}
export interface TaskTicketPage {
  items: TaskTicketRecord[];
  total: number;
  page: number;
  pageSize: number;
}
export interface AdminTicketRecord extends TicketRecord {
  reporter: TicketPerson;
  version: number;
  serviceMode: TicketServiceMode;
  serviceModeChange: {
    actor: TicketPerson;
    reason: string;
    createdAt: string;
  } | null;
  assignment: {
    actor: TicketPerson;
    assignee: TicketPerson;
    createdAt: string;
  } | null;
}
export interface AdminTicketPage {
  items: AdminTicketRecord[];
  total: number;
  page: number;
  pageSize: number;
}
export interface TicketPage {
  items: TicketRecord[];
  total: number;
  page: number;
  pageSize: number;
}
export interface TicketPhoto {
  id: string;
  width: number;
  height: number;
  bytes: number;
  createdAt: string;
}

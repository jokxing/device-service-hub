import type { TicketPhoto } from "@device-service-hub/contracts";
import type {
  AuthenticatedRead,
  AuthenticatedPost,
} from "../../../shared/api/http";
const path = (ticketId: string) =>
  `/mobile/tickets/${encodeURIComponent(ticketId)}/photos`;
export const listPhotos = (
  request: AuthenticatedRead,
  ticketId: string,
  signal?: AbortSignal,
) => request<TicketPhoto[]>(path(ticketId), signal);
export const photoPath = (ticketId: string, photoId: string) =>
  `${path(ticketId)}/${encodeURIComponent(photoId)}`;
export const uploadPhoto = (
  post: AuthenticatedPost,
  ticketId: string,
  photoId: string,
  body: FormData,
  signal?: AbortSignal,
) => post<TicketPhoto>(photoPath(ticketId, photoId), body, signal);

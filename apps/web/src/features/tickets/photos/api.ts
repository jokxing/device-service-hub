import type { TicketPhoto } from "@device-service-hub/contracts";
import { apiImageRequest, apiRequest } from "../../../shared/api/http";

const photoPath = (ticketId: string) =>
  `/admin/tickets/${encodeURIComponent(ticketId)}/photos`;

export const adminPhotosApi = {
  list: (ticketId: string, signal: AbortSignal) =>
    apiRequest<TicketPhoto[]>(photoPath(ticketId), { signal }),
  content: (ticketId: string, photoId: string, signal: AbortSignal) =>
    apiImageRequest(
      `${photoPath(ticketId)}/${encodeURIComponent(photoId)}`,
      signal,
    ),
};

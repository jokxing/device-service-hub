import "server-only";
import type {
  ReporterTicketRecord,
  TicketPage,
} from "@device-service-hub/contracts";
import { reporterGet } from "../../auth/server/resources";
import { PAGE_SIZE } from "../constants";

export function getMyTickets(page: number) {
  return reporterGet<TicketPage>(
    `/tickets/mine?page=${page}&pageSize=${PAGE_SIZE}`,
  );
}
export function getMyTicket(id: string) {
  return reporterGet<ReporterTicketRecord>(
    "/tickets/" + encodeURIComponent(id),
  );
}

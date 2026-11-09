import "server-only";
import { reporterPost } from "../../auth/server/commands";

export function createTicket(request: Request) {
  return reporterPost(
    request,
    "/tickets",
    "尚未确认提交结果，请重试相同内容或查看我的报修",
  );
}
export function confirmTicket(request: Request, id: string) {
  return reporterPost(
    request,
    `/tickets/${encodeURIComponent(id)}/confirm`,
    "尚未确认操作结果，可重试，或关闭后刷新报修记录核对。",
  );
}

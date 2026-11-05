import ticketStyles from "../tickets.module.css";
import { Button } from "antd";
import { useDemoTickets } from "../../../demo/useDemoTickets";
import { canTransition } from "../ticketRules";
import type { Ticket, TicketNoteKind } from "../types";
interface Props {
  ticket: Ticket;
  onAssign: (id: string) => void;
  onNote: (kind: TicketNoteKind) => void;
}
export default function TicketActions({ ticket, onAssign, onNote }: Props) {
  const { actor, transition } = useDemoTickets();
  return (
    <div className={ticketStyles["detail-actions"]}>
      {canTransition(ticket, "assigned", actor) && (
        <Button type="primary" onClick={() => onAssign(ticket.id)}>
          {ticket.assignee ? "改派维修人员" : "分派维修人员"}
        </Button>
      )}
      {actor.role === "technician" &&
        canTransition(ticket, "processing", actor) && (
          <Button
            type="primary"
            onClick={() =>
              transition(
                ticket.id,
                "processing",
                actor.name + "已接单，开始处理",
              )
            }
          >
            接单处理
          </Button>
        )}
      {canTransition(ticket, "pending", actor) && (
        <Button onClick={() => onNote("return")}>退回分派</Button>
      )}
      {canTransition(ticket, "confirming", actor) && (
        <Button type="primary" onClick={() => onNote("result")}>
          提交处理结果
        </Button>
      )}
      {canTransition(ticket, "completed", actor) && (
        <Button
          type="primary"
          onClick={() =>
            transition(ticket.id, "completed", "报修用户确认设备已恢复正常")
          }
        >
          确认完成
        </Button>
      )}
      {actor.role === "reporter" &&
        canTransition(ticket, "processing", actor) && (
          <Button onClick={() => onNote("reject")}>仍有问题</Button>
        )}
      {canTransition(ticket, "cancelled", actor) && (
        <Button danger onClick={() => onNote("cancel")}>
          {actor.role === "admin" ? "取消工单" : "撤销报修"}
        </Button>
      )}
    </div>
  );
}

import { useState } from "react";
import { App, Modal, Select } from "antd";
import { DEMO_TECHNICIANS } from "../../../demo/accounts";
import { useDemoTickets } from "../../../demo/useDemoTickets";
import type { Ticket } from "../types";
interface Props {
  ticket: Ticket;
  onClose: () => void;
}
export default function AssignTicketModal({ ticket, onClose }: Props) {
  const [assignee, setAssignee] = useState(ticket.assignee);
  const { actor, transition } = useDemoTickets();
  const { message } = App.useApp();
  function submit() {
    if (!assignee) {
      message.warning("请选择维修人员");
      return;
    }
    if (
      transition(
        ticket.id,
        "assigned",
        actor.name + "分派给" + assignee,
        assignee,
      )
    )
      onClose();
  }
  return (
    <Modal
      open
      title="分派维修人员"
      onCancel={onClose}
      onOk={submit}
      okText="确认分派"
      cancelText="取消"
    >
      <p className="muted">{ticket.id} · 改派后需要新维修人员重新接单。</p>
      <Select
        aria-label="选择维修人员"
        placeholder="选择维修人员"
        style={{ width: "100%", margin: "12px 0" }}
        value={assignee}
        onChange={setAssignee}
        options={DEMO_TECHNICIANS.map((value) => ({ value, label: value }))}
      />
    </Modal>
  );
}

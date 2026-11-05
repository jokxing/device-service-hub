import { useState } from "react";
import { App, Input, Modal } from "antd";
import { useDemoTickets } from "../../../demo/useDemoTickets";
import { TICKET_LIMITS, TICKET_NOTE_META } from "../constants";
import type { TicketNoteKind } from "../types";
interface Props {
  kind: TicketNoteKind;
  ticketId: string;
  onClose: () => void;
}
export default function TicketNoteModal({ kind, ticketId, onClose }: Props) {
  const [note, setNote] = useState("");
  const { transition } = useDemoTickets();
  const { message } = App.useApp();
  const meta = TICKET_NOTE_META[kind];
  function submit() {
    if (!note.trim()) {
      message.warning("请填写" + meta.field);
      return;
    }
    if (transition(ticketId, meta.nextStatus, note.trim())) onClose();
  }
  return (
    <Modal
      open
      title={meta.title}
      onCancel={onClose}
      onOk={submit}
      okText={meta.okText}
      cancelText="取消"
    >
      <Input.TextArea
        aria-label={meta.field}
        placeholder={meta.placeholder}
        rows={4}
        value={note}
        maxLength={TICKET_LIMITS.description}
        onChange={(event) => setNote(event.target.value)}
      />
    </Modal>
  );
}

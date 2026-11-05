import { useState } from "react";
import { useDemoTickets } from "../../../demo/useDemoTickets";
import type { TicketListMode } from "../types";
import TicketList from "./TicketList";
import TicketDetailDrawer from "./TicketDetailDrawer";
import AssignTicketModal from "./AssignTicketModal";
export default function TicketWorkspace({ mode }: { mode: TicketListMode }) {
  const { visibleTickets } = useDemoTickets();
  const [selectedId, setSelectedId] = useState<string>();
  const [assignId, setAssignId] = useState<string>();
  const selected = visibleTickets.find((ticket) => ticket.id === selectedId);
  const assigning = visibleTickets.find((ticket) => ticket.id === assignId);
  return (
    <>
      <TicketList mode={mode} onView={setSelectedId} onAssign={setAssignId} />
      {selected && (
        <TicketDetailDrawer
          key={selected.id}
          selected={selected}
          onClose={() => setSelectedId(undefined)}
          onAssign={setAssignId}
        />
      )}
      {assigning && (
        <AssignTicketModal
          key={assigning.id}
          ticket={assigning}
          onClose={() => setAssignId(undefined)}
        />
      )}
    </>
  );
}

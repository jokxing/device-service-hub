import type { TicketRecord } from "@device-service-hub/contracts";

export default function TicketActionSummary({
  ticket,
}: {
  ticket: Pick<TicketRecord, "code" | "title" | "device">;
}) {
  return (
    <>
      <p>
        <strong>
          {ticket.code} · {ticket.title}
        </strong>
      </p>
      <p className="muted">
        {ticket.device.name} · {ticket.device.location}
      </p>
    </>
  );
}

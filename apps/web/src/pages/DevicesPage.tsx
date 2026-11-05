import { useState } from "react";
import { useDemoTickets } from "../demo/useDemoTickets";
import DeviceTable from "../features/devices/components/DeviceTable";
import ContentCard from "../shared/components/ContentCard";
import DeviceDetailModal from "../features/devices/components/DeviceDetailModal";
export default function DevicesPage() {
  const { visibleDevices, visibleTickets } = useDemoTickets();
  const [selectedId, setSelectedId] = useState<string>();
  const selected = visibleDevices.find((device) => device.id === selectedId);
  return (
    <ContentCard
      title="设备列表"
      count={visibleDevices.length}
      extra={<span className="muted">仅展示当前角色可见设备</span>}
    >
      <DeviceTable visibleDevices={visibleDevices} onView={setSelectedId} />
      {selected && (
        <DeviceDetailModal
          device={selected}
          recordCount={
            visibleTickets.filter(
              (ticket) =>
                ticket.deviceId === selected.id &&
                ticket.status === "completed",
            ).length
          }
          onClose={() => setSelectedId(undefined)}
        />
      )}
    </ContentCard>
  );
}

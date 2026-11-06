import { useCallback, useState } from "react";
import { Alert, Button, Empty, Spin } from "antd";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "../app/routes";
import ContentCard from "../shared/components/ContentCard";
import ServicePageHeader from "../shared/components/ServicePageHeader";
import { useApiResource } from "../shared/hooks/useApiResource";
import { useSession } from "../features/auth/sessionContext";
import { devicesApi } from "../features/devices/api";
import DeviceTable from "../features/devices/components/DeviceTable";
import ConnectedDeviceDetail from "../features/devices/components/ConnectedDeviceDetail";
import ConnectedCreateTicketModal from "../features/tickets/components/ConnectedCreateTicketModal";

export default function ConnectedDevicesPage() {
  const { user, clearSession } = useSession();
  const navigate = useNavigate();
  const load = useCallback(
    (signal: AbortSignal) => devicesApi.list(signal),
    [],
  );
  const {
    data: devices,
    loading,
    error,
    refresh,
  } = useApiResource(load, clearSession);
  const [selectedId, setSelectedId] = useState<string>();
  const [repairDeviceId, setRepairDeviceId] = useState<string>();
  const repairDevice = devices?.find((device) => device.id === repairDeviceId);
  return (
    <>
      <ServicePageHeader
        title="设备台账"
        description={
          user?.role === "reporter"
            ? "查看授权设备的状态与位置，选择启用设备发起报修。"
            : "查看当前账号有权访问的设备及其详细信息。"
        }
      />
      <ContentCard
        title="我的可见设备"
        count={devices?.length}
        extra={
          <Button loading={loading} onClick={refresh}>
            刷新
          </Button>
        }
      >
        {error ? (
          <Alert type="error" title={error} showIcon className="m-5" />
        ) : loading ? (
          <Spin tip="正在读取设备">
            <div className="min-h-32" />
          </Spin>
        ) : devices?.length ? (
          <DeviceTable
            visibleDevices={devices}
            onView={setSelectedId}
            onReport={user?.role === "reporter" ? setRepairDeviceId : undefined}
          />
        ) : (
          <Empty description="当前账号暂无可访问的设备" className="my-10" />
        )}
      </ContentCard>
      {selectedId && (
        <ConnectedDeviceDetail
          key={selectedId}
          id={selectedId}
          onClose={() => setSelectedId(undefined)}
        />
      )}
      {repairDevice && (
        <ConnectedCreateTicketModal
          key={repairDevice.id}
          device={repairDevice}
          onClose={() => setRepairDeviceId(undefined)}
          onCreated={(ticket) =>
            navigate(ROUTES.serviceTickets + "/" + ticket.id)
          }
        />
      )}
    </>
  );
}

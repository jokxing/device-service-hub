import { useEffect, useState } from "react";
import { Alert, Button, Modal, Spin } from "antd";
import type { DeviceSummary } from "@device-service-hub/contracts";
import { ApiError } from "../../../shared/api/http";
import { useSession } from "../../auth/sessionContext";
import { devicesApi } from "../api";
import DeviceDetailModal from "./DeviceDetailModal";

export default function ConnectedDeviceDetail({
  id,
  onClose,
}: {
  id: string;
  onClose: () => void;
}) {
  const { clearSession } = useSession();
  const [device, setDevice] = useState<DeviceSummary>();
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    devicesApi
      .detail(id, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setDevice(result);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        if (error instanceof ApiError && error.status === 401) clearSession();
        else setError(error instanceof Error ? error.message : "设备加载失败");
      });
    return () => controller.abort();
  }, [id, clearSession]);
  if (device) return <DeviceDetailModal device={device} onClose={onClose} />;
  return (
    <Modal
      open
      title="设备详情"
      onCancel={onClose}
      footer={<Button onClick={onClose}>关闭</Button>}
    >
      {error ? (
        <Alert showIcon type="error" title={error} />
      ) : (
        <Spin tip="正在加载设备">
          <div className="min-h-24" />
        </Spin>
      )}
    </Modal>
  );
}

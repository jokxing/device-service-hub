import { Button, Modal } from "antd";
import type { Device } from "../types";
import styles from "../devices.module.css";

interface Props {
  device: Device;
  recordCount: number;
  onClose: () => void;
}

export default function DeviceDetailModal({
  device,
  recordCount,
  onClose,
}: Props) {
  return (
    <Modal
      open
      title={device.name}
      onCancel={onClose}
      footer={
        <Button type="primary" onClick={onClose}>
          知道了
        </Button>
      }
    >
      <div className={styles["device-info"]}>
        <p>设备编号：{device.id}</p>
        <p>型号：{device.model}</p>
        <p>位置：{device.location}</p>
        <p>可见维修记录：{recordCount} 条</p>
        <p className="muted">这是虚构设备，不代表硬件已连接。</p>
      </div>
    </Modal>
  );
}

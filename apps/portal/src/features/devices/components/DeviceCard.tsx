import Link from "next/link";
import type { DeviceSummary } from "@device-service-hub/contracts";
import DeviceStatus from "./DeviceStatus";
import styles from "../devices.module.css";

export default function DeviceCard({ device }: { device: DeviceSummary }) {
  return (
    <article className={styles.card} aria-label={device.name}>
      <div className={styles.cardTop}>
        <span className={styles.code}>{device.code}</span>
        <DeviceStatus enabled={device.enabled} />
      </div>
      <h2 className={styles.title}>{device.name}</h2>
      <div className={styles.fields}>
        <div>
          <small>设备类别</small>
          <strong>{device.category}</strong>
        </div>
        <div>
          <small>安装位置</small>
          <strong>{device.location}</strong>
        </div>
      </div>
      <Link
        className={styles.action}
        href={`/devices/${encodeURIComponent(device.id)}`}
        prefetch={false}
      >
        查看设备详情 →
      </Link>
    </article>
  );
}

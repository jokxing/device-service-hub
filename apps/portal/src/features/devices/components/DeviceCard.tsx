import Link from "next/link";
import type { DeviceSummary } from "@device-service-hub/contracts";
import DeviceStatus from "./DeviceStatus";
import styles from "../../../shared/components/PortalPage.module.css";

export default function DeviceCard({ device }: { device: DeviceSummary }) {
  return (
    <article className={styles.card} aria-label={device.name}>
      <div className={styles.row}>
        <span className={styles.eyebrow}>{device.code}</span>
        <DeviceStatus enabled={device.enabled} />
      </div>
      <h2 className={styles.cardTitle}>{device.name}</h2>
      <dl className={styles.fields}>
        <dt>设备类别</dt>
        <dd>{device.category}</dd>
        <dt>安装位置</dt>
        <dd>{device.location}</dd>
      </dl>
      <Link href={`/devices/${encodeURIComponent(device.id)}`} prefetch={false}>
        查看设备详情 →
      </Link>
    </article>
  );
}

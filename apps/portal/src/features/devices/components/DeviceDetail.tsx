import gridStyles from "../../../shared/components/DetailGrid.module.css";
import DetailField from "../../../shared/components/DetailField";
import Link from "next/link";
import type { DeviceSummary } from "@device-service-hub/contracts";
import ContentCard from "../../../shared/components/ContentCard";
import RefreshButton from "../../../shared/components/RefreshButton";
import DeviceStatus from "./DeviceStatus";
import styles from "../devices.module.css";

export default function DeviceDetail({ device }: { device: DeviceSummary }) {
  return (
    <ContentCard
      title={device.code}
      extra={
        <div className={styles.detailExtra}>
          <DeviceStatus enabled={device.enabled} />
          <RefreshButton label="刷新设备" />
        </div>
      }
    >
      <div className={styles.detailBody}>
        <h2 className={styles.detailTitle}>{device.name}</h2>
        <div className={gridStyles.detailGrid}>
          <DetailField label="设备类别">{device.category}</DetailField>
          <DetailField label="设备型号">{device.model || "未填写"}</DetailField>
          <DetailField label="安装位置">{device.location}</DetailField>
          <DetailField label="当前状态">
            {device.enabled ? "启用" : "停用"}
          </DetailField>
        </div>
        {device.enabled ? (
          <Link
            className={styles.primaryAction}
            href={`/devices/${encodeURIComponent(device.id)}/repair`}
            prefetch={false}
          >
            发起报修
          </Link>
        ) : (
          <p className={styles.disabledNotice} role="status">
            设备已停用，暂时无法发起新报修。
          </p>
        )}
      </div>
    </ContentCard>
  );
}

import Link from "next/link";
import { getDevice } from "../../../../features/devices/server/queries";
import DeviceStatus from "../../../../features/devices/components/DeviceStatus";
import styles from "../../../../shared/components/PortalPage.module.css";

export const metadata = { title: "设备详情" };
export default async function DevicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const device = await getDevice(id);
  return (
    <>
      <Link href="/devices" className={styles.back} prefetch={false}>
        ← 返回我的设备
      </Link>
      <h1 className={styles.heading}>设备详情</h1>
      <p className={styles.description}>核对设备标识、型号与安装位置。</p>
      <article className={styles.card}>
        <div className={styles.row}>
          <span className={styles.eyebrow}>{device.code}</span>
          <DeviceStatus enabled={device.enabled} />
        </div>
        <h2 className={styles.cardTitle}>{device.name}</h2>
        <dl className={styles.fields}>
          <dt>设备类别</dt>
          <dd>{device.category}</dd>
          <dt>设备型号</dt>
          <dd>{device.model || "未填写"}</dd>
          <dt>安装位置</dt>
          <dd>{device.location}</dd>
        </dl>
      </article>
    </>
  );
}

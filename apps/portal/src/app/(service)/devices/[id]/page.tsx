import Link from "next/link";
import PageHeader from "../../../../shared/components/PageHeader";
import { getDevice } from "../../../../features/devices/server/queries";
import DeviceStatus from "../../../../features/devices/components/DeviceStatus";
import ticketStyles from "../../../../features/tickets/tickets.module.css";
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
      <PageHeader
        title="设备详情"
        description="核对设备标识、型号与安装位置。"
        back={{ href: "/devices", label: "返回我的设备" }}
      />
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
        {device.enabled ? (
          <Link
            className={ticketStyles.linkButton}
            href={`/devices/${encodeURIComponent(device.id)}/repair`}
            prefetch={false}
          >
            发起报修
          </Link>
        ) : (
          <p className={styles.notice}>设备已停用，暂时无法发起新报修。</p>
        )}
      </article>
    </>
  );
}

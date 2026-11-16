import DeviceCard from "../../../features/devices/components/DeviceCard";
import { getDevices } from "../../../features/devices/server/queries";
import ContentCard from "../../../shared/components/ContentCard";
import PageHeader from "../../../shared/components/PageHeader";
import RefreshButton from "../../../shared/components/RefreshButton";
import styles from "../../../features/devices/devices.module.css";

export const metadata = { title: "我的设备" };
export default async function DevicesPage() {
  const devices = await getDevices();
  return (
    <>
      <PageHeader
        title="我的设备"
        description={`共 ${devices.length} 台授权设备，查看设备信息与当前启用状态。`}
      />
      <ContentCard
        title="授权设备"
        count={devices.length}
        extra={<RefreshButton />}
      >
        {devices.length ? (
          <ul className={styles.grid} aria-label="授权设备列表">
            {devices.map((device) => (
              <li key={device.id}>
                <DeviceCard device={device} />
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.empty}>
            暂无授权设备，请联系管理员确认设备访问权限。
          </div>
        )}
      </ContentCard>
      <p className={styles.notice}>
        在设备详情中发起文字报修，提交后可在“我的报修”中查看处理进度。
      </p>
    </>
  );
}

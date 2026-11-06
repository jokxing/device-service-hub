import DeviceCard from "../../../features/devices/components/DeviceCard";
import { getDevices } from "../../../features/devices/server/queries";
import styles from "../../../shared/components/PortalPage.module.css";

export const metadata = { title: "我的设备" };
export default async function DevicesPage() {
  const devices = await getDevices();
  return (
    <>
      <h1 className={styles.heading}>我的设备</h1>
      <p className={styles.description}>
        共 {devices.length} 台授权设备，查看设备信息与当前启用状态。
      </p>
      {devices.length ? (
        <ul className={styles.grid} aria-label="授权设备列表">
          {devices.map((device) => (
            <li key={device.id}>
              <DeviceCard device={device} />
            </li>
          ))}
        </ul>
      ) : (
        <section className={styles.card}>
          暂无授权设备，请联系管理员确认设备访问权限。
        </section>
      )}
      <p className={styles.notice}>
        在设备详情中发起文字报修，提交后可在“我的报修”中查看处理进度。
      </p>
    </>
  );
}

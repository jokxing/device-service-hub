import styles from "../../../shared/components/PortalPage.module.css";
export default function Loading() {
  return (
    <p role="status" className={styles.card}>
      正在读取设备资料…
    </p>
  );
}

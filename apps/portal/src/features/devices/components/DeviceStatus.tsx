import styles from "../../../shared/components/PortalPage.module.css";
export default function DeviceStatus({ enabled }: { enabled: boolean }) {
  return (
    <span className={`${styles.badge} ${enabled ? "" : styles.disabled}`}>
      {enabled ? "启用" : "停用"}
    </span>
  );
}

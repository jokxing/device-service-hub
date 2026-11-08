import styles from "../app.module.css";
import { Link } from "react-router-dom";

export default function OverviewPage() {
  return (
    <section className={styles["shell-overview"]}>
      <span className={styles["shell-eyebrow"]}>SERVICE OPERATIONS</span>
      <h1>设备服务，有序协同</h1>
      <p>从工单分派到维修跟进，在统一入口处理设备服务。</p>
      <div className={styles["shell-entry"]}>
        <span className={styles["shell-entry-icon"]} aria-hidden="true">
          ↗
        </span>
        <div>
          <h2>工单后台</h2>
          <p>查看报修、安排维修人员，跟进处理结果与现场照片。</p>
        </div>
        <Link
          className={styles["shell-primary"]}
          to="/tickets/service/admin/tickets"
        >
          进入工单后台
        </Link>
      </div>
    </section>
  );
}

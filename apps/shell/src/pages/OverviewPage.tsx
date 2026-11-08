import styles from "../app.module.css";
import { Link } from "react-router-dom";
import { TICKETS_APP, DEVICES_APP } from "../micro/apps";

const entries = [
  {
    title: "工单后台",
    description: "查看报修、安排维修人员，跟进处理结果与现场照片。",
    to: `${TICKETS_APP.basePath}/service/admin/tickets`,
  },
  {
    title: "设备台账",
    description: "查看授权设备、核对安装位置，并进入服务后台跟进。",
    to: DEVICES_APP.basePath,
  },
];

export default function OverviewPage() {
  return (
    <section className={styles["shell-overview"]}>
      <span className={styles["shell-eyebrow"]}>SERVICE OPERATIONS</span>
      <h1>设备服务，有序协同</h1>
      <p>从工单分派到维修跟进，在统一入口处理设备服务。</p>
      {entries.map((entry) => (
        <div key={entry.to} className={styles["shell-entry"]}>
          <span className={styles["shell-entry-icon"]} aria-hidden="true">
            ↗
          </span>
          <div>
            <h2>{entry.title}</h2>
            <p>{entry.description}</p>
          </div>
          <Link className={styles["shell-primary"]} to={entry.to}>
            进入{entry.title}
          </Link>
        </div>
      ))}
    </section>
  );
}

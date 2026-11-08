import styles from "../app.module.css";
import { useTicketsApp } from "../micro/useTicketsApp";

export default function TicketsPage() {
  const { container, phase, retry } = useTicketsApp();
  return (
    <>
      {phase === "loading" && (
        <p role="status" className={styles["shell-feedback"]}>
          正在加载工单后台…
        </p>
      )}
      {phase === "failed" && (
        <div
          role="alert"
          className={[styles["shell-feedback"], styles["shell-error"]].join(
            " ",
          )}
        >
          <strong>工单后台暂时无法加载</strong>
          <p>请确认工单子应用服务已启动，然后重试。</p>
          <button className={styles["shell-primary"]} onClick={retry}>
            重新加载
          </button>
        </div>
      )}
      <div ref={container} aria-label="工单子应用容器" />
    </>
  );
}

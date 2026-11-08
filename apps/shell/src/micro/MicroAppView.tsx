import type { ServiceNavigationRequest } from "@device-service-hub/contracts";
import { useMicroApp } from "./useMicroApp";
import type { MicroAppDefinition } from "./types";
import styles from "../app.module.css";

export default function MicroAppView({
  definition,
  onNavigate,
}: {
  definition: MicroAppDefinition;
  onNavigate?: (message: ServiceNavigationRequest) => void;
}) {
  const { container, phase, retry } = useMicroApp(definition, onNavigate);
  return (
    <>
      {phase === "loading" && (
        <p role="status" className={styles["shell-feedback"]}>
          正在加载{definition.label}…
        </p>
      )}
      {phase === "failed" && (
        <div
          role="alert"
          className={[styles["shell-feedback"], styles["shell-error"]].join(
            " ",
          )}
        >
          <strong>{definition.label}暂时无法加载</strong>
          <p>请确认子应用服务已启动，然后重试。</p>
          <button className={styles["shell-primary"]} onClick={retry}>
            重新加载
          </button>
        </div>
      )}
      <div ref={container} aria-label={`${definition.label}子应用容器`} />
    </>
  );
}

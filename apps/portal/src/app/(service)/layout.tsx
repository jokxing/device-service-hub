import type { ReactNode } from "react";
import { requireReporter } from "../../features/auth/server/session";
import LogoutButton from "../../features/auth/components/LogoutButton";
import styles from "../../shared/components/PortalPage.module.css";

export const dynamic = "force-dynamic";
export default async function ServiceLayout({
  children,
}: {
  children: ReactNode;
}) {
  const user = await requireReporter();
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <div>
          <div className={styles.brand}>DEVICE SERVICE HUB</div>
          <p className={styles.brandTitle}>设备服务门户</p>
        </div>
        <div className={styles.identity}>
          <span>{user.name} · 报修用户</span>
          <LogoutButton />
        </div>
      </header>
      <main>{children}</main>
      <footer className={styles.footer}>设备资料来自设备服务平台</footer>
    </div>
  );
}

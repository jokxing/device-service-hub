import { redirect } from "next/navigation";
import { currentUser } from "../../features/auth/server/session";
import LoginForm from "../../features/auth/components/LoginForm";
import styles from "../../shared/components/PortalPage.module.css";

export const metadata = { title: "登录" };
export default async function LoginPage() {
  const user = await currentUser();
  if (user?.role === "reporter") redirect("/devices");
  return (
    <main className={styles.shell}>
      <div className={styles.login}>
        <div className={styles.brand}>DEVICE SERVICE HUB</div>
        <h1 className={styles.loginTitle}>设备服务门户</h1>
        <p className={styles.description}>
          登录后查看授权设备、提交报修并跟进处理进度。
        </p>
        <section className={styles.card} aria-label="账号登录">
          <LoginForm />
        </section>
        <p className={styles.footer}>
          本入口面向报修用户。管理员与维修人员请使用现有管理后台。
        </p>
      </div>
    </main>
  );
}

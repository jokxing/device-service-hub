import { useState } from "react";
import { Alert, App, Button, Space } from "antd";
import { Link, Navigate, NavLink, Outlet } from "react-router-dom";
import { ROUTES } from "../app/routes";
import { useSession } from "../features/auth/sessionContext";
import SessionFeedback from "../features/auth/components/SessionFeedback";
import { ROLE_LABELS } from "../shared/constants/roles";
import styles from "./service.module.css";

export default function ServiceLayout() {
  const { user, status, signOut } = useSession();
  const { message } = App.useApp();
  const [leaving, setLeaving] = useState(false);
  if (status === "loading" || status === "unavailable")
    return <SessionFeedback />;
  if (!user) return <Navigate to={ROUTES.login} replace />;
  async function logout() {
    setLeaving(true);
    try {
      await signOut();
    } catch {
      message.error("退出失败，请稍后重试");
      setLeaving(false);
    }
  }
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <span className={styles.eyebrow}>DEVICE SERVICE HUB</span>
          <strong>设备服务平台</strong>
        </div>
        <Space wrap>
          <span>
            {user.name} · {ROLE_LABELS[user.role]}
          </span>
          <Button onClick={logout} loading={leaving}>
            退出登录
          </Button>
        </Space>
      </header>
      <nav className={styles.nav} aria-label="设备服务导航">
        <NavLink
          to={ROUTES.serviceDevices}
          className={({ isActive }) => (isActive ? styles.active : undefined)}
        >
          设备台账
        </NavLink>
        {user.role === "reporter" && (
          <NavLink
            to={ROUTES.serviceTickets}
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            我的报修
          </NavLink>
        )}
        {user.role === "admin" && (
          <NavLink
            to={ROUTES.serviceAdminTickets}
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            工单分派
          </NavLink>
        )}
        {user.role === "technician" && (
          <NavLink
            to={ROUTES.serviceTasks}
            className={({ isActive }) => (isActive ? styles.active : undefined)}
          >
            我的任务
          </NavLink>
        )}
      </nav>
      <Alert
        showIcon
        type="info"
        title="已连接本地服务与数据库"
        description={
          <>
            支持报修、分派、接单、处理结果与用户确认；管理员可查看现场照片，Web
            上传与退回尚未开放。
            <Link to={ROUTES.tickets}>工单演示工作台</Link> 使用独立的演示数据。
          </>
        }
        className={styles.notice}
      />
      <main className={styles.content}>
        <Outlet key={user.id} />
      </main>
    </div>
  );
}

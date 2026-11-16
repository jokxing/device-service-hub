import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router-dom";
import { getServicePageTitle, ROUTES } from "../app/routes";
import { useSession } from "../features/auth/sessionContext";
import SessionFeedback from "../features/auth/components/SessionFeedback";
import { useApiMutation } from "../shared/hooks/useApiMutation";
import layoutStyles from "./layout.module.css";
import styles from "./service.module.css";
import ServiceHeader from "./ServiceHeader";
import ServiceMobileNav from "./ServiceMobileNav";
import ServiceSidebar from "./ServiceSidebar";

export default function ServiceLayout() {
  const { user, status, signOut, clearSession } = useSession();
  const { pathname } = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    submitting: leaving,
    error,
    run,
  } = useApiMutation({
    onUnauthorized: clearSession,
    fallbackError: "退出未完成，请核对登录状态后重试",
  });
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  if (status === "loading" || status === "unavailable")
    return <SessionFeedback />;
  if (!user) return <Navigate to={ROUTES.login} replace />;
  function logout() {
    return run(
      (signal) => signOut(signal),
      () => {},
    );
  }
  const title = getServicePageTitle(pathname);
  return (
    <div className={[layoutStyles["app-shell"], styles.shell].join(" ")}>
      <ServiceSidebar user={user} loggingOut={leaving} onLogout={logout} />
      <ServiceMobileNav
        open={menuOpen}
        user={user}
        onClose={() => setMenuOpen(false)}
      />
      <div
        className={[layoutStyles["main-shell"], styles.mainShell].join(" ")}
        data-service-main
      >
        <ServiceHeader
          title={title}
          user={user}
          loggingOut={leaving}
          menuOpen={menuOpen}
          onOpenMenu={() => setMenuOpen(true)}
          onLogout={logout}
        />
        {error && (
          <p className={styles.logoutError} role="alert">
            {error}
          </p>
        )}
        <main className={[layoutStyles.content, styles.content].join(" ")}>
          <Outlet key={user.id} />
        </main>
      </div>
    </div>
  );
}

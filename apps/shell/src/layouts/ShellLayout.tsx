import styles from "../app.module.css";
import { useLayoutEffect, useRef } from "react";
import { Link, NavLink, Outlet, useMatch } from "react-router-dom";
import { TICKETS_APP } from "../micro/tickets";

export default function ShellLayout() {
  const ticketsActive = useMatch(`${TICKETS_APP.basePath}/*`) !== null;
  const pageRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const page = pageRef.current;
    const header = headerRef.current;
    const nav = navRef.current;
    if (!page || !header || !nav) return;
    const updateHeight = () => {
      const occupied = Math.ceil(
        header.getBoundingClientRect().height +
          nav.getBoundingClientRect().height,
      );
      page.style.setProperty(
        "--micro-viewport-height",
        `max(0px, calc(100dvh - ${occupied}px))`,
      );
    };
    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    observer.observe(nav);
    return () => {
      observer.disconnect();
      page.style.removeProperty("--micro-viewport-height");
    };
  }, []);
  return (
    <div ref={pageRef} className={styles["shell-page"]}>
      <header ref={headerRef} className={styles["shell-header"]}>
        <div>
          <span className={styles["shell-eyebrow"]}>DEVICE SERVICE HUB</span>
          <strong>设备服务协同台</strong>
        </div>
        <span className={styles["shell-subtitle"]}>
          设备与售后服务 · 统一工作入口
        </span>
      </header>
      <nav ref={navRef} className={styles["shell-nav"]} aria-label="协同台导航">
        <NavLink to="/" end>
          工作台总览
        </NavLink>
        <Link
          to={`${TICKETS_APP.basePath}/service/admin/tickets`}
          aria-current={ticketsActive ? "page" : undefined}
        >
          工单后台
        </Link>
      </nav>
      <main className={styles["shell-content"]}>
        <Outlet />
      </main>
    </div>
  );
}

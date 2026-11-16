"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, Button, Drawer } from "antd";
import { MenuOutlined } from "@ant-design/icons";
import type { PublicUser } from "@device-service-hub/contracts";
import { PortalBrand, PortalIdentity } from "./PortalIdentity";
import LogoutButton from "../../features/auth/components/LogoutButton";
import {
  getPortalPageTitle,
  matchPortalNavHref,
  PORTAL_NAV_ITEMS,
} from "./portalNav";
import styles from "./portal-shell.module.css";

function NavLinks({
  selected,
  onNavigate,
  className,
  activeClassName,
}: {
  selected?: string;
  onNavigate?: () => void;
  className: string;
  activeClassName: string;
}) {
  return PORTAL_NAV_ITEMS.map((item) => (
    <Link
      key={item.href}
      href={item.href}
      prefetch={false}
      onClick={onNavigate}
      className={
        selected === item.href ? `${className} ${activeClassName}` : className
      }
      aria-current={selected === item.href ? "true" : undefined}
    >
      <span aria-hidden="true">{item.icon}</span>
      {item.label}
    </Link>
  ));
}

export default function PortalServiceChrome({
  user,
  children,
}: {
  user: PublicUser;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const selected = matchPortalNavHref(pathname);
  const title = getPortalPageTitle(pathname);
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar} data-portal-sidebar>
        <Link className={styles.brand} href="/devices" prefetch={false}>
          <PortalBrand />
        </Link>
        <div className={styles.workspaceLabel}>
          用户门户 <span>报修入口</span>
        </div>
        <nav className={styles.navigation} aria-label="门户导航">
          <NavLinks
            selected={selected}
            className={styles.navItem}
            activeClassName={styles.navItemActive}
          />
        </nav>
        <div className={styles.sidebarBottom}>
          <div className={styles.environment}>
            <i />
            本地服务环境
            <span>v0.1</span>
          </div>
          <div className={styles.profile}>
            <PortalIdentity user={user} />
          </div>
        </div>
      </aside>
      <Drawer
        id="portal-mobile-nav"
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        placement="left"
        width={280}
        closable
        title="门户导航"
        classNames={{ body: styles.drawerBody }}
        destroyOnHidden
      >
        <Link
          className={styles.drawerBrand}
          href="/devices"
          prefetch={false}
          onClick={() => setMenuOpen(false)}
        >
          <PortalBrand drawer />
        </Link>
        <nav className={styles.drawerNav} aria-label="门户导航">
          <NavLinks
            selected={selected}
            onNavigate={() => setMenuOpen(false)}
            className={styles.drawerItem}
            activeClassName={styles.drawerItemActive}
          />
        </nav>
        <div className={styles.drawerProfile}>
          <PortalIdentity user={user} />
        </div>
      </Drawer>
      <div className={styles.mainShell}>
        <header className={styles.topbar}>
          <div className={styles.topbarStart}>
            <Button
              type="text"
              className={styles.menuButton}
              icon={<MenuOutlined />}
              aria-label="打开门户导航"
              aria-expanded={menuOpen}
              aria-controls="portal-mobile-nav"
              onClick={() => setMenuOpen(true)}
            >
              <span className={styles.menuLabel}>菜单</span>
            </Button>
            <div className={styles.breadcrumb}>
              用户门户<span>/</span>
              <strong>{title}</strong>
            </div>
          </div>
          <div className={styles.topbarEnd}>
            <span className={styles.envBadge}>
              <i />
              用户门户
            </span>
            <span className={styles.separator} />
            <Avatar
              className={styles.desktopAvatar}
              size={29}
              style={{
                background: "#e9effa",
                color: "#557098",
                fontSize: 11,
              }}
            >
              <span aria-hidden="true">{user.name.slice(-2)}</span>
            </Avatar>
            <LogoutButton />
          </div>
        </header>
        <main className={styles.content}>{children}</main>
        <footer className={styles.footer}>设备资料来自设备服务平台</footer>
      </div>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "antd";
import styles from "./PortalPage.module.css";

const items = [
  { href: "/devices", label: "我的设备" },
  { href: "/tickets", label: "我的报修" },
  { href: "/orders", label: "我的订单" },
];

export default function PortalNavigation() {
  const pathname = usePathname();
  const selected = items.find(
    ({ href }) => pathname === href || pathname.startsWith(href + "/"),
  )?.href;
  return (
    <nav aria-label="门户导航" className={styles.nav}>
      <Menu
        mode="horizontal"
        selectedKeys={selected ? [selected] : []}
        className={styles.menu}
        items={items.map(({ href, label }) => ({
          key: href,
          label: (
            <Link
              href={href}
              prefetch={false}
              aria-current={selected === href ? "true" : undefined}
            >
              {label}
            </Link>
          ),
        }))}
      />
    </nav>
  );
}

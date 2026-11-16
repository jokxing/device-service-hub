import type { ReactNode } from "react";
import {
  DesktopOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";

export interface PortalNavItem {
  href: string;
  label: string;
  icon: ReactNode;
}

export const PORTAL_NAV_ITEMS: PortalNavItem[] = [
  {
    href: "/devices",
    label: "我的设备",
    icon: <DesktopOutlined />,
  },
  {
    href: "/tickets",
    label: "我的报修",
    icon: <FileSearchOutlined />,
  },
  {
    href: "/orders",
    label: "我的订单",
    icon: <SafetyCertificateOutlined />,
  },
];

export function getPortalPageTitle(pathname: string): string {
  if (pathname.startsWith("/orders/")) return "订单详情";
  if (pathname === "/orders") return "我的订单";
  if (pathname.startsWith("/tickets/")) return "报修详情";
  if (pathname === "/tickets") return "我的报修";
  if (/^\/devices\/[^/]+\/repair(?:\/|$)/.test(pathname)) return "提交报修";
  if (/^\/devices\/[^/]+(?:\/|$)/.test(pathname)) return "设备详情";
  return "我的设备";
}

export function matchPortalNavHref(pathname: string): string | undefined {
  return PORTAL_NAV_ITEMS.find(
    ({ href }) => pathname === href || pathname.startsWith(href + "/"),
  )?.href;
}

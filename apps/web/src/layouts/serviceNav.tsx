import type { ReactNode } from "react";
import {
  AppstoreOutlined,
  DesktopOutlined,
  FileSearchOutlined,
  SafetyCertificateOutlined,
  ToolOutlined,
} from "@ant-design/icons";
import type { PublicUser } from "@device-service-hub/contracts";
import { ROUTES } from "../app/routes";

export interface ServiceNavItem {
  to: string;
  label: string;
  icon: ReactNode;
}

export function serviceNavItemsForRole(
  role: PublicUser["role"],
): ServiceNavItem[] {
  const items: ServiceNavItem[] = [
    {
      to: ROUTES.serviceDevices,
      label: "设备台账",
      icon: <DesktopOutlined />,
    },
  ];
  if (role === "reporter") {
    items.push({
      to: ROUTES.serviceTickets,
      label: "我的报修",
      icon: <FileSearchOutlined />,
    });
  }
  if (role === "admin") {
    items.push({
      to: ROUTES.serviceAdminTickets,
      label: "工单分派",
      icon: <AppstoreOutlined />,
    });
  }
  if (role === "technician") {
    items.push({
      to: ROUTES.serviceTasks,
      label: "我的任务",
      icon: <ToolOutlined />,
    });
  }
  if (role !== "reporter") {
    items.push({
      to: ROUTES.serviceOrders,
      label: "服务订单",
      icon: <SafetyCertificateOutlined />,
    });
  }
  return items;
}

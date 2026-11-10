export const ROUTES = {
  login: "/login",
  serviceDevices: "/service/devices",
  serviceTickets: "/service/tickets",
  serviceAdminTickets: "/service/admin/tickets",
  serviceTasks: "/service/tasks",
  serviceOrders: "/service/orders",
  tickets: "/tickets",
  devices: "/devices",
  records: "/records",
} as const;
export const PAGE_META = {
  [ROUTES.tickets]: {
    title: "工单工作台",
    description: "跟进每一张工单，让设备服务有序运转。",
  },
  [ROUTES.devices]: {
    title: "设备台账",
    description: "统一查看设备资料，快速定位每一台设备。",
  },
  [ROUTES.records]: {
    title: "维修记录",
    description: "每一次处理都有记录，让服务过程清晰可追溯。",
  },
} as const;

export function getPageMeta(pathname: string) {
  return (
    PAGE_META[pathname as keyof typeof PAGE_META] ?? PAGE_META[ROUTES.tickets]
  );
}

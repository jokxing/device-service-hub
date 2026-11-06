import type { Role } from "@device-service-hub/contracts";

export const SERVICE_STEPS = [
  {
    title: "确认设备",
    description: "核对设备编号、名称与位置，确认本次报修对象。",
  },
  { title: "描述问题", description: "说明故障现象、出现时间和影响范围。" },
  {
    title: "跟进维修",
    description: "管理员分派后，由维修人员接单处理并提交结果。",
  },
  {
    title: "确认完成",
    description: "核对维修说明与设备实际情况后，由报修用户确认。",
  },
] as const;
export const ROLE_GUIDES: ReadonlyArray<{
  role: Role;
  title: string;
  description: string;
}> = [
  {
    role: "reporter",
    title: "报修用户",
    description: "查看授权设备、提交报修、跟进本人记录并确认维修完成。",
  },
  {
    role: "admin",
    title: "管理员",
    description: "在管理后台查看和分派工单，跟进处理记录。",
  },
  {
    role: "technician",
    title: "维修人员",
    description: "查看当前分派给自己的任务，接单并提交处理结果。",
  },
];

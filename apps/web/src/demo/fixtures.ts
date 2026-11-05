import type { Device } from "../features/devices/types";
import type { Status, Ticket } from "../features/tickets/types";
// Fictional fixtures only; no real users, hardware connection, or production data.
export const devices: Device[] = [
  {
    id: "AC-001",
    name: "中央空调 · 一楼大厅",
    category: "空调设备",
    location: "A 座 · 1F 大厅",
    model: "KFR-120LW",
    enabled: true,
    users: ["张明", "刘欣"],
  },
  {
    id: "WP-002",
    name: "循环水泵 · 二号机组",
    category: "动力设备",
    location: "B 座 · 地下设备间",
    model: "ISG 50-160",
    enabled: true,
    users: ["刘欣"],
  },
  {
    id: "PR-003",
    name: "多功能打印机",
    category: "办公设备",
    location: "A 座 · 3F 办公区",
    model: "LaserJet M428",
    enabled: true,
    users: ["张明"],
  },
  {
    id: "AC-004",
    name: "会议室壁挂空调",
    category: "空调设备",
    location: "A 座 · 2F 会议室",
    model: "KFR-35GW",
    enabled: true,
    users: ["张明", "周宇"],
  },
  {
    id: "EL-005",
    name: "货运电梯 · 东侧",
    category: "运输设备",
    location: "B 座 · 东侧",
    model: "THJ 1000",
    enabled: true,
    users: ["周宇"],
  },
  {
    id: "AC-006",
    name: "旧款柜式空调",
    category: "空调设备",
    location: "A 座 · 1F 仓库",
    model: "KFR-72LW",
    enabled: false,
    users: ["张明"],
  },
];
const seed: Array<
  [string, string, string, string, Status, string | undefined, boolean]
> = [
  [
    "0012",
    "大厅空调不制冷，出风温度偏高",
    "AC-001",
    "张明",
    "pending",
    undefined,
    true,
  ],
  [
    "0011",
    "循环水泵运行时有明显异响",
    "WP-002",
    "刘欣",
    "processing",
    "王志远",
    true,
  ],
  [
    "0010",
    "打印机连续卡纸，无法正常打印",
    "PR-003",
    "张明",
    "assigned",
    "李建国",
    false,
  ],
  [
    "0009",
    "会议室空调室内机漏水",
    "AC-004",
    "周宇",
    "confirming",
    "王志远",
    false,
  ],
  [
    "0008",
    "货运电梯开门响应缓慢",
    "EL-005",
    "周宇",
    "pending",
    undefined,
    true,
  ],
  [
    "0007",
    "空调遥控器无法调节温度",
    "AC-004",
    "张明",
    "pending",
    undefined,
    false,
  ],
  ["0006", "水泵压力表读数异常", "WP-002", "刘欣", "assigned", "王志远", false],
  [
    "0005",
    "打印机扫描文件出现黑色条纹",
    "PR-003",
    "张明",
    "completed",
    "赵晨",
    false,
  ],
  [
    "0004",
    "大厅空调滤网清洁后仍有异味",
    "AC-001",
    "张明",
    "completed",
    "李建国",
    false,
  ],
  [
    "0003",
    "会议室空调外机振动偏大",
    "AC-004",
    "周宇",
    "processing",
    "赵晨",
    false,
  ],
  [
    "0002",
    "电梯轿厢照明灯闪烁",
    "EL-005",
    "周宇",
    "completed",
    "王志远",
    false,
  ],
  [
    "0001",
    "重复提交的空调报修",
    "AC-001",
    "张明",
    "cancelled",
    undefined,
    false,
  ],
];
export const initialTickets: Ticket[] = seed.map(
  ([id, title, deviceId, reporter, status, assignee, urgent], index) => ({
    id: `WO-202611-${id}`,
    title,
    deviceId,
    reporter,
    status,
    assignee,
    priority: urgent ? "urgent" : "normal",
    created: `2026-11-${index < 7 ? "05" : "04"} ${String(10 - (index % 3)).padStart(2, "0")}:${index % 2 ? "15" : "30"}`,
    description: `${title}。已尝试检查基本操作，问题仍然存在，请安排人员现场检查。`,
    events: [
      {
        title: "提交报修",
        time: "11-05 09:00",
        detail: `${reporter}提交了设备报修`,
      },
      ...(assignee
        ? [
            {
              title: "已分派",
              time: "11-05 09:15",
              detail: `陈管理员分派给${assignee}`,
            },
          ]
        : []),
      ...(["processing", "confirming", "completed"].includes(status)
        ? [
            {
              title: "维修人员接单",
              time: "11-05 09:25",
              detail: `${assignee}开始处理`,
            },
          ]
        : []),
      ...(["confirming", "completed"].includes(status)
        ? [
            {
              title: "提交处理结果",
              time: "11-05 10:00",
              detail: "故障已排查并处理，请报修人检查设备运行情况。",
            },
          ]
        : []),
      ...(status === "completed"
        ? [
            {
              title: "用户确认完成",
              time: "11-05 10:20",
              detail: "设备恢复正常，工单已完成。",
            },
          ]
        : []),
      ...(status === "cancelled"
        ? [
            {
              title: "报修人撤销",
              time: "11-05 09:02",
              detail: "重复报修，保留另一张工单。",
            },
          ]
        : []),
    ],
  }),
);

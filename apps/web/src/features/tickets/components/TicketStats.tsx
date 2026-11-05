import ticketStyles from "../tickets.module.css";
import {
  ArrowRightOutlined,
  ClockCircleOutlined,
  ToolOutlined,
  CustomerServiceOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import type { TicketCounts, TicketTab } from "../types";
interface Props {
  counts: TicketCounts;
  onSelect: (tab: TicketTab) => void;
}
export default function TicketStats({ counts, onSelect }: Props) {
  return (
    <section className={ticketStyles["stats-grid"]} aria-label="工单概况">
      {[
        {
          label: "待分派工单",
          number: counts.pending,
          icon: <ClockCircleOutlined />,
          className: "amber",
          sub: "等待安排维修人员",
          status: "pending",
        },
        {
          label: "服务进行中",
          number: counts.processing,
          icon: <ToolOutlined />,
          className: "blue",
          sub: "包含待接单与处理中",
          status: "processing",
        },
        {
          label: "待用户确认",
          number: counts.confirming,
          icon: <CustomerServiceOutlined />,
          className: "violet",
          sub: "处理完成，等待验收",
          status: "confirming",
        },
        {
          label: "已完成工单",
          number: counts.completed,
          icon: <CheckCircleOutlined />,
          className: "green",
          sub: "已由报修用户确认",
          status: "completed",
        },
      ].map((item) => (
        <button
          className={[
            ticketStyles["stat-card"],
            ticketStyles[item.className],
          ].join(" ")}
          key={item.label}
          onClick={() => {
            onSelect(
              item.status === "processing"
                ? "active"
                : (item.status as TicketTab),
            );
          }}
        >
          <div className={ticketStyles["stat-top"]}>
            <span>{item.label}</span>
            <span className={ticketStyles["stat-icon"]}>{item.icon}</span>
          </div>
          <div className={ticketStyles["stat-value"]}>
            {String(item.number).padStart(2, "0")}
            <span>单</span>
          </div>
          <div className={ticketStyles["stat-bottom"]}>
            <span className={ticketStyles["tiny-dot"]} />
            <span className={ticketStyles["stat-description"]}>{item.sub}</span>
            <ArrowRightOutlined />
          </div>
        </button>
      ))}
    </section>
  );
}

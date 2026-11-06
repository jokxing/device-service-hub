import { Select } from "antd";
import type { TicketStatus } from "@device-service-hub/contracts";
import { STATUS_OPTIONS } from "../constants";
import styles from "../connected.module.css";

interface Props {
  label: string;
  value?: TicketStatus;
  onChange: (status?: TicketStatus) => void;
  description: string;
}
export default function TicketStatusFilter({
  label,
  value,
  onChange,
  description,
}: Props) {
  return (
    <div className={styles.toolbar}>
      <Select<TicketStatus | "all">
        aria-label={label}
        value={value ?? "all"}
        options={[{ value: "all", label: "全部状态" }, ...STATUS_OPTIONS]}
        onChange={(next) => onChange(next === "all" ? undefined : next)}
      />
      <span className="muted">{description}</span>
    </div>
  );
}

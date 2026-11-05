import ticketStyles from "../tickets.module.css";
import { Tag } from "antd";
import { STATUS_META } from "../constants";
import type { Status } from "../types";
export default function StatusTag({ status }: { status: Status }) {
  const meta = STATUS_META[status];
  return (
    <Tag className={ticketStyles["status-tag"]} color={meta.color}>
      <span className={ticketStyles["status-dot"]} />
      {meta.label}
    </Tag>
  );
}

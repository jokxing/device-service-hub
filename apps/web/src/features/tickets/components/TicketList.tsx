import ticketStyles from "../tickets.module.css";
import { App, Button, Tooltip } from "antd";
import { DownloadOutlined, ReloadOutlined } from "@ant-design/icons";
import { useDemoTickets } from "../../../demo/useDemoTickets";
import { downloadCsv } from "../../../shared/utils/csv";
import ContentCard from "../../../shared/components/ContentCard";
import { STATUS_META } from "../constants";
import { filterTickets, getTicketCounts } from "../ticketRules";
import { useTicketFilters } from "../hooks/useTicketFilters";
import type { TicketListMode } from "../types";
import TicketFilters from "./TicketFilters";
import TicketTable from "./TicketTable";
interface Props {
  mode: TicketListMode;
  onView: (id: string) => void;
  onAssign: (id: string) => void;
}
export default function TicketList({ mode, onView, onAssign }: Props) {
  const { visibleTickets, visibleDevices, role } = useDemoTickets();
  const { filters, updateFilters, resetFilters } = useTicketFilters();
  const { message } = App.useApp();
  const source =
    mode === "completed"
      ? visibleTickets.filter((ticket) => ticket.status === "completed")
      : visibleTickets;
  const filtered = filterTickets(
    source,
    visibleDevices,
    mode === "completed" ? { ...filters, tab: "all" } : filters,
  );
  function exportTickets() {
    downloadCsv("工单演示数据.csv", [
      ["工单编号", "报修内容", "设备编号", "状态", "报修人", "维修人员"],
      ...filtered.map((ticket) => [
        ticket.id,
        ticket.title,
        ticket.deviceId,
        STATUS_META[ticket.status].label,
        ticket.reporter,
        ticket.assignee ?? "未分派",
      ]),
    ]);
  }
  return (
    <ContentCard
      title={mode === "completed" ? "已完成维修" : "工单管理"}
      count={source.length}
      extra={
        <div className={ticketStyles["table-tools"]}>
          <Tooltip title="清除筛选">
            <Button
              type="text"
              icon={<ReloadOutlined />}
              aria-label="清除筛选"
              onClick={() => {
                resetFilters();
                message.info("筛选已重置；演示数据未重新加载");
              }}
            />
          </Tooltip>
          <Button icon={<DownloadOutlined />} onClick={exportTickets}>
            导出
          </Button>
        </div>
      }
    >
      <TicketFilters
        filters={filters}
        onChange={updateFilters}
        total={source.length}
        pending={getTicketCounts(source).pending}
        resultCount={filtered.length}
        showTabs={mode === "all"}
      />
      <TicketTable
        tickets={filtered}
        devices={visibleDevices}
        role={role}
        page={filters.page}
        onPageChange={(page) => updateFilters({ page })}
        onView={onView}
        onAssign={onAssign}
      />
    </ContentCard>
  );
}

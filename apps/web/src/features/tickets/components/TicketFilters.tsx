import ticketStyles from "../tickets.module.css";
import { Input, Select } from "antd";
import {
  CloseOutlined,
  FilterOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import { PRIORITY_OPTIONS, STATUS_OPTIONS, TICKET_TABS } from "../constants";
import type { TicketFilters as FilterValues } from "../types";
interface Props {
  filters: FilterValues;
  onChange: (patch: Partial<FilterValues>) => void;
  total: number;
  pending: number;
  resultCount: number;
  showTabs: boolean;
}
export default function TicketFilters({
  filters,
  onChange,
  total,
  pending,
  resultCount,
  showTabs,
}: Props) {
  return (
    <>
      {showTabs && (
        <div
          className={ticketStyles["tabs"]}
          role="tablist"
          aria-label="工单状态"
        >
          {TICKET_TABS.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={filters.tab === tab.key}
              className={
                filters.tab === tab.key
                  ? [ticketStyles["tab"], ticketStyles["active"]].join(" ")
                  : ticketStyles["tab"]
              }
              onClick={() => onChange({ tab: tab.key, status: undefined })}
            >
              <span>{tab.name}</span>
              {(tab.key === "all" || tab.key === "pending") && (
                <em>{tab.key === "all" ? total : pending}</em>
              )}
            </button>
          ))}
          {filters.tab === "active" && (
            <button
              className={[ticketStyles["tab"], ticketStyles["active"]].join(
                " ",
              )}
              role="tab"
              aria-selected="true"
              onClick={() => onChange({ tab: "all" })}
            >
              服务进行中 <CloseOutlined />
            </button>
          )}
        </div>
      )}
      <div className={ticketStyles["filter-bar"]}>
        <Input
          aria-label="搜索工单"
          prefix={<SearchOutlined />}
          placeholder="搜索工单编号、报修内容或设备"
          value={filters.query}
          onChange={(event) => onChange({ query: event.target.value })}
          allowClear
          className={ticketStyles["search-input"]}
        />
        <Select
          aria-label="状态筛选"
          placeholder="全部状态"
          allowClear
          value={filters.status}
          onChange={(status) => onChange({ status })}
          options={STATUS_OPTIONS}
        />
        <Select
          aria-label="优先级筛选"
          placeholder="全部优先级"
          allowClear
          value={filters.priority}
          onChange={(priority) => onChange({ priority })}
          options={PRIORITY_OPTIONS}
        />
        <span className={ticketStyles["filter-summary"]}>
          <FilterOutlined />共 {resultCount} 条结果
        </span>
      </div>
    </>
  );
}

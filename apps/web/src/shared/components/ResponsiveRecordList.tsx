import type { ReactNode } from "react";
import { Empty, Grid, Pagination, Table } from "antd";
import type { TableProps } from "antd";
import styles from "./CompactRecordCard.module.css";

interface Props<T extends { id: string }> {
  records: T[];
  pagination: { page: number; pageSize: number; total: number };
  onPageChange: (page: number) => void;
  columns: TableProps<T>["columns"];
  renderCard: (record: T) => ReactNode;
  listLabel: string;
  unitLabel: string;
  emptyText: string;
  scrollX: number;
}

/** Presentation shell; callers own columns, card fields and business actions. */
export default function ResponsiveRecordList<T extends { id: string }>({
  records,
  pagination,
  onPageChange,
  columns,
  renderCard,
  listLabel,
  unitLabel,
  emptyText,
  scrollX,
}: Props<T>) {
  const screens = Grid.useBreakpoint();
  const pager = {
    current: pagination.page,
    pageSize: pagination.pageSize,
    total: pagination.total,
    showSizeChanger: false,
    onChange: onPageChange,
  };
  const totalText = (total: number) => `共 ${total} 条${unitLabel}`;
  if (!screens.md)
    return (
      <>
        {records.length ? (
          <ul className={styles.list} aria-label={listLabel}>
            {records.map((record) => (
              <li key={record.id}>{renderCard(record)}</li>
            ))}
          </ul>
        ) : (
          <Empty description={emptyText} className="my-6" />
        )}
        <div className={styles.pagination}>
          <span className="muted">{totalText(pagination.total)}</span>
          <Pagination simple {...pager} />
        </div>
      </>
    );
  return (
    <Table<T>
      rowKey="id"
      dataSource={records}
      columns={columns}
      scroll={{ x: scrollX }}
      pagination={{ ...pager, showTotal: totalText }}
      locale={{ emptyText }}
    />
  );
}

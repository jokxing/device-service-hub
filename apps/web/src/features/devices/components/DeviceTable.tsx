import { Button, Empty, Grid, Space, Table, Tag } from "antd";
import type { DeviceTableRow } from "../types";
import CompactRecordCard from "../../../shared/components/CompactRecordCard";
import cardStyles from "../../../shared/components/CompactRecordCard.module.css";
interface Props {
  visibleDevices: DeviceTableRow[];
  onView: (id: string) => void;
  onReport?: (id: string) => void;
}
export default function DeviceTable({
  visibleDevices,
  onView,
  onReport,
}: Props) {
  const screens = Grid.useBreakpoint();
  if (!screens.md) {
    if (!visibleDevices.length)
      return <Empty description="暂无设备" className="my-6" />;
    return (
      <ul className={cardStyles.list} aria-label="设备列表">
        {visibleDevices.map((device) => (
          <li key={device.id}>
            <CompactRecordCard
              eyebrow={device.code ?? device.id}
              title={device.name}
              badge={
                <Tag color={device.enabled ? "green" : "default"}>
                  {device.enabled ? "启用" : "停用"}
                </Tag>
              }
              fields={[
                { label: "类别", value: device.category },
                { label: "位置", value: device.location },
              ]}
              actions={
                <>
                  <Button onClick={() => onView(device.id)}>详情</Button>
                  {onReport && (
                    <Button
                      type="primary"
                      disabled={!device.enabled}
                      onClick={() => onReport(device.id)}
                    >
                      报修
                    </Button>
                  )}
                </>
              }
            />
          </li>
        ))}
      </ul>
    );
  }
  return (
    <Table<DeviceTableRow>
      rowKey="id"
      dataSource={visibleDevices}
      pagination={false}
      scroll={{ x: 760 }}
      columns={[
        {
          title: "设备编号",
          key: "code",
          render: (_, device) => device.code ?? device.id,
        },
        { title: "设备名称", dataIndex: "name" },
        { title: "类别", dataIndex: "category" },
        { title: "安装位置", dataIndex: "location" },
        {
          title: "状态",
          dataIndex: "enabled",
          render: (enabled) => (
            <Tag color={enabled ? "green" : "default"}>
              {enabled ? "启用" : "停用"}
            </Tag>
          ),
        },
        {
          title: "操作",
          render: (_, d) => (
            <Space>
              <Button type="link" onClick={() => onView(d.id)}>
                详情
              </Button>
              {onReport && (
                <Button
                  type="link"
                  disabled={!d.enabled}
                  onClick={() => onReport(d.id)}
                >
                  报修
                </Button>
              )}
            </Space>
          ),
        },
      ]}
    />
  );
}

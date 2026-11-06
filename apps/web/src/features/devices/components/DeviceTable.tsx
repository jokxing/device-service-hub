import { Button, Table, Tag } from "antd";
import type { DeviceTableRow } from "../types";
interface Props {
  visibleDevices: DeviceTableRow[];
  onView: (id: string) => void;
}
export default function DeviceTable({ visibleDevices, onView }: Props) {
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
            <Button type="link" onClick={() => onView(d.id)}>
              详情
            </Button>
          ),
        },
      ]}
    />
  );
}

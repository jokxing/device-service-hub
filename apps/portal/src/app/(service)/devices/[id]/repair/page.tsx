import PageHeader from "../../../../../shared/components/PageHeader";
import ContentCard from "../../../../../shared/components/ContentCard";
import { getDevice } from "../../../../../features/devices/server/queries";
import RepairForm from "../../../../../features/tickets/components/RepairForm";
import deviceStyles from "../../../../../features/devices/devices.module.css";

export const metadata = { title: "提交报修" };
export default async function RepairPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const device = await getDevice(id);
  return (
    <>
      <PageHeader
        title="提交报修"
        description="填写故障信息，管理员将根据报修内容安排维修。"
        back={{
          href: `/devices/${encodeURIComponent(id)}`,
          label: "返回设备详情",
        }}
      />
      <ContentCard title="设备报修">
        <div className={deviceStyles.repairBody} aria-label="设备报修">
          <div className={deviceStyles.repairDevice}>
            <div>
              <small>报修设备</small>
              <strong>
                {device.code} · {device.name}
              </strong>
            </div>
            <div>
              <small>安装位置</small>
              <strong>{device.location}</strong>
            </div>
          </div>
          {device.enabled ? (
            <RepairForm device={device} />
          ) : (
            <p className={deviceStyles.disabledNotice} role="status">
              设备已停用，暂时无法发起新报修。
            </p>
          )}
        </div>
      </ContentCard>
    </>
  );
}

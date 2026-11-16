import PageHeader from "../../../../shared/components/PageHeader";
import DeviceDetail from "../../../../features/devices/components/DeviceDetail";
import { getDevice } from "../../../../features/devices/server/queries";

export const metadata = { title: "设备详情" };
export default async function DevicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const device = await getDevice(id);
  return (
    <>
      <PageHeader
        title="设备详情"
        description="核对设备标识、型号与安装位置。"
        back={{ href: "/devices", label: "返回我的设备" }}
      />
      <DeviceDetail device={device} />
    </>
  );
}

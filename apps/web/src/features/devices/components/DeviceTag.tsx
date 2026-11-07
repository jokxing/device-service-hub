import { Alert, QRCode, Typography } from "antd";
import { encodeDeviceTag } from "@device-service-hub/contracts/device-tags";
export default function DeviceTag({ code }: { code: string }) {
  let value: string;
  try {
    value = encodeDeviceTag(code);
  } catch {
    return (
      <Alert
        type="info"
        title="该设备编号暂不支持二维码，请通过设备列表查看。"
      />
    );
  }
  return (
    <div className="mt-5 flex flex-col items-center gap-3">
      <div role="img" aria-label={`设备二维码 ${code}`}>
        <QRCode type="svg" value={value} size={192} />
      </div>
      <Typography.Text copyable={{ text: value }}>
        设备编号：{code}
      </Typography.Text>
      <Typography.Text type="secondary">
        扫码后仍需校验当前账号的设备权限
      </Typography.Text>
    </div>
  );
}

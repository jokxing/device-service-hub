import { Text } from "react-native";
import { typography } from "../../../shared/styles/typography";
import type { DeviceCameraProps } from "./types";
export default function DeviceCamera(_props: DeviceCameraProps) {
  return (
    <Text style={typography.muted}>
      浏览器仅预览界面，请在原生客户端使用相机扫码。
    </Text>
  );
}

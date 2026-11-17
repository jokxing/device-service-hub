import { StyleSheet, Text } from "react-native";
import { colors, fontSizes, lineHeights } from "../../../shared/theme";
import type { DeviceCameraProps } from "./types";

export default function DeviceCamera(_props: DeviceCameraProps) {
  return (
    <Text style={styles.hint}>
      浏览器仅预览界面，请在原生客户端使用相机扫码。仅识别本平台设备二维码，不会自动打开外部链接。
    </Text>
  );
}

const styles = StyleSheet.create({
  hint: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
});

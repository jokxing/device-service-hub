import { useCallback, useEffect, useState } from "react";
import { AppState, Linking, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import ActionButton from "../../../shared/components/ActionButton";
import { typography } from "../../../shared/styles/typography";
import { colors, radii, spacing } from "../../../shared/theme";
import type { DeviceCameraProps } from "./types";

export default function DeviceCamera({ paused, onCode }: DeviceCameraProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [enabled, setEnabled] = useState(false),
    [focused, setFocused] = useState(false),
    [active, setActive] = useState(AppState.currentState === "active");
  const [failure, setFailure] = useState(""),
    [requesting, setRequesting] = useState(false),
    [ready, setReady] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );
  useEffect(() => {
    const listener = AppState.addEventListener("change", (state) =>
      setActive(state === "active"),
    );
    return () => {
      listener.remove();
    };
  }, []);
  async function start() {
    setRequesting(true);
    setFailure("");
    setReady(false);
    try {
      const result = permission?.granted
        ? permission
        : await requestPermission();
      if (result.granted) setEnabled(true);
      else setFailure("相机权限未开启，可继续手动输入设备编号。");
    } catch {
      setFailure("无法开启相机，请使用手动输入。");
    } finally {
      setRequesting(false);
    }
  }
  const preview =
    enabled && permission?.granted && focused && active && !paused && !failure;
  return (
    <View style={styles.section}>
      {preview && (
        <View style={styles.preview}>
          <CameraView
            style={StyleSheet.absoluteFill}
            facing="back"
            barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            onBarcodeScanned={({ data }) => onCode(data)}
            onCameraReady={() => setReady(true)}
            onMountError={() =>
              setFailure("相机无法启动，请重试或手动输入设备编号。")
            }
          />
        </View>
      )}
      <Text style={typography.muted}>
        {failure ||
          (paused
            ? "识别已暂停，可手动输入或重新扫码。"
            : preview
              ? ready
                ? "相机已就绪，请对准设备二维码。"
                : "正在启动相机…"
              : "仅识别本平台设备二维码，不会自动打开外部链接。")}
      </Text>
      {!paused && !preview && (
        <ActionButton
          title={enabled ? "重试相机" : "开启相机扫码"}
          secondary
          pending={requesting}
          onPress={() => void start()}
        />
      )}
      {permission && !permission.granted && !permission.canAskAgain && (
        <ActionButton
          title="打开系统设置"
          secondary
          onPress={() => {
            void Linking.openSettings().catch(() =>
              setFailure("无法打开设置，请手动开启相机权限。"),
            );
          }}
        />
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  section: { gap: spacing.sm },
  preview: {
    width: "100%",
    height: 260,
    borderRadius: radii.card,
    backgroundColor: colors.text,
    overflow: "hidden",
  },
});

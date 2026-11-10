import { useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import ActionButton from "../../shared/components/ActionButton";
import { typography } from "../../shared/styles/typography";
import {
  colors,
  controlSizes,
  fontSizes,
  radii,
  spacing,
} from "../../shared/theme";
import { useNativeSession } from "../auth/sessionContext";
import DeviceCamera from "./scan/DeviceCamera";
import { useDeviceScan } from "./scan/useDeviceScan";
function Scanner() {
  const scan = useDeviceScan();
  const [input, setInput] = useState("");
  return (
    <Screen>
      <Text style={typography.text}>
        扫描设备标签，查看当前账号有权访问的设备。
      </Text>
      <DeviceCamera paused={scan.paused || scan.pending} onCode={scan.onCode} />
      {!!scan.error && (
        <Text accessibilityRole="alert" style={typography.error}>
          {scan.error}
        </Text>
      )}
      {scan.paused && (
        <ActionButton
          title="重新扫码"
          secondary
          disabled={scan.pending}
          onPress={() => {
            Keyboard.dismiss();
            scan.reset();
          }}
        />
      )}
      <Text style={typography.text}>手动输入设备编号</Text>
      <TextInput
        autoComplete="off"
        importantForAutofill="no"
        accessibilityLabel="设备编号或二维码内容"
        value={input}
        onFocus={scan.pause}
        onChangeText={setInput}
        maxLength={128}
        autoCapitalize="none"
        autoCorrect={false}
        editable={!scan.pending}
        placeholder="例如 AC-001，或粘贴设备二维码内容"
        style={styles.input}
      />
      <ActionButton
        title="查看设备"
        pending={scan.pending}
        disabled={!input.trim()}
        onPress={() => scan.submit(input)}
      />
      <Text style={typography.muted}>
        设备二维码不代表访问授权，查询和报修权限仍由服务端校验。
      </Text>
    </Screen>
  );
}
export default function ScanDeviceScreen() {
  const { user } = useNativeSession();
  const router = useRouter();
  return user?.role === "technician" ? (
    <Screen>
      <Text style={typography.text}>
        维修人员请通过“我的任务”查看当前分派设备。
      </Text>
      <ActionButton
        title="返回我的任务"
        secondary
        onPress={() => router.dismissTo("/tasks")}
      />
    </Screen>
  ) : (
    <Scanner />
  );
}
const styles = StyleSheet.create({
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.input,
    padding: spacing.sm,
    minHeight: controlSizes.minHeight,
    fontSize: fontSizes.input,
  },
});

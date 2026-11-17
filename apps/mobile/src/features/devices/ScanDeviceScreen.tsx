import { useState } from "react";
import { Keyboard, StyleSheet, Text, TextInput, View } from "react-native";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import {
  colors,
  controlSizes,
  fontSizes,
  lineHeights,
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
    <Screen dense>
      <View style={styles.heading}>
        <Text style={styles.lead}>
          扫描设备标签，或手动输入编号，查看当前账号有权访问的设备。
        </Text>
      </View>

      <ContentCard title="相机扫码">
        <DeviceCamera paused={scan.paused || scan.pending} onCode={scan.onCode} />
        {!!scan.error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {scan.error}
          </Text>
        ) : null}
        {scan.paused ? (
          <ActionButton
            title="重新扫码"
            secondary
            compact
            disabled={scan.pending}
            onPress={() => {
              Keyboard.dismiss();
              scan.reset();
            }}
          />
        ) : null}
      </ContentCard>

      <ContentCard title="手动输入">
        <View style={styles.field}>
          <Text style={styles.label}>设备编号或二维码内容</Text>
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
            placeholderTextColor={colors.muted}
            style={styles.input}
          />
        </View>
        <ActionButton
          title="查看设备"
          pending={scan.pending}
          disabled={!input.trim()}
          onPress={() => scan.submit(input)}
        />
      </ContentCard>

      <Text style={styles.notice}>
        设备二维码不代表访问授权，查询和报修权限仍由服务端校验。
      </Text>
    </Screen>
  );
}

export default function ScanDeviceScreen() {
  const { user } = useNativeSession();
  if (user?.role === "technician") {
    return (
      <Screen dense>
        <ContentCard title="扫码不可用">
          <Text style={styles.meta}>
            维修人员请通过「我的任务」查看当前分派设备，不开放独立设备台账扫码入口。
          </Text>
        </ContentCard>
      </Screen>
    );
  }
  return <Scanner />;
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xxs },
  lead: {
    color: colors.muted,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  field: { gap: spacing.xs },
  label: {
    color: colors.text,
    fontSize: fontSizes.caption,
    fontWeight: "600",
  },
  input: {
    backgroundColor: colors.surface,
    color: colors.text,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.input,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: controlSizes.minHeight,
    fontSize: fontSizes.input,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  meta: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
  notice: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
});

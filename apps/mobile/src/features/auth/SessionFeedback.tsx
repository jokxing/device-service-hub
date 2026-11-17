import { StyleSheet, Text, View } from "react-native";
import Screen from "../../shared/components/Screen";
import ActionButton from "../../shared/components/ActionButton";
import { colors, fontSizes, lineHeights, spacing } from "../../shared/theme";
import { useNativeSession } from "./sessionContext";

export default function SessionFeedback() {
  const { status, restore } = useNativeSession();
  const loading = status === "loading";
  return (
    <Screen dense safeTop>
      <View style={styles.block}>
        <Text accessibilityRole="header" style={styles.title}>
          {loading ? "正在核对登录状态…" : "无法恢复登录状态"}
        </Text>
        <Text style={styles.meta}>
          {loading
            ? "正在读取本机会话，请稍候。"
            : "请检查服务连接后重试。若仍失败，可重新登录。"}
        </Text>
      </View>
      {!loading ? (
        <ActionButton title="重试连接" onPress={() => void restore()} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  block: { gap: spacing.xs },
  title: {
    color: colors.text,
    fontSize: fontSizes.section,
    fontWeight: "600",
  },
  meta: {
    color: colors.muted,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
});

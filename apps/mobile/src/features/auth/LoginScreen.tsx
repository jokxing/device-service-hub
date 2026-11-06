import { useState } from "react";
import { Platform, StyleSheet, Text, TextInput, View } from "react-native";
import { Redirect } from "expo-router";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import {
  colors,
  fontSizes,
  spacing,
  lineHeights,
  radii,
  controlSizes,
} from "../../shared/theme";
import { useAction } from "../../shared/hooks/useAction";
import { useNativeSession } from "./sessionContext";
import SessionFeedback from "./SessionFeedback";

export default function LoginScreen() {
  const { status, signIn, user } = useNativeSession();
  const [username, setUsername] = useState(""),
    [password, setPassword] = useState("");
  const { pending, error, run } = useAction();
  if (status === "loading" || status === "unavailable")
    return <SessionFeedback />;
  if (status === "authenticated")
    return (
      <Redirect href={user?.role === "technician" ? "/tasks" : "/devices"} />
    );
  return (
    <Screen>
      <Text accessibilityRole="header" style={styles.title}>
        登录设备服务
      </Text>
      <Text style={styles.muted}>使用分配的账号，查看你有权访问的设备。</Text>
      <ContentCard title="账号登录">
        <View style={styles.field}>
          <Text style={styles.label}>账号</Text>
          <TextInput
            accessibilityLabel="账号"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            editable={!pending && Platform.OS !== "web"}
            style={styles.input}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>密码</Text>
          <TextInput
            accessibilityLabel="密码"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
            editable={!pending && Platform.OS !== "web"}
            style={styles.input}
          />
        </View>
        {error && (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        )}
        {Platform.OS === "web" ? (
          <Text style={styles.muted}>
            浏览器仅预览移动界面，请在 Android 客户端登录。
          </Text>
        ) : (
          <ActionButton
            title="登录"
            pending={pending}
            disabled={!username.trim() || !password}
            onPress={() => void run(() => signIn(username, password))}
          />
        )}
      </ContentCard>
    </Screen>
  );
}
const styles = StyleSheet.create({
  title: {
    color: colors.text,
    fontSize: fontSizes.pageTitle,
    fontWeight: "700",
  },
  muted: {
    color: colors.muted,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  field: { gap: spacing.xs },
  label: { color: colors.text, fontSize: fontSizes.body },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    padding: spacing.sm,
    minHeight: controlSizes.minHeight,
    fontSize: fontSizes.input,
    color: colors.text,
  },
  error: { color: colors.danger, fontSize: fontSizes.body },
});

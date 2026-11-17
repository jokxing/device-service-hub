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
    <Screen dense safeTop>
      <View style={styles.heading}>
        <Text style={styles.brand}>DEVICE SERVICE HUB</Text>
        <Text accessibilityRole="header" style={styles.title}>
          登录设备服务
        </Text>
        <Text style={styles.lead}>
          使用分配的账号登录，按权限查看授权设备与本人业务记录。
        </Text>
      </View>

      <View style={styles.accent}>
        <Text style={styles.accentTitle}>原生客户端登录</Text>
        <Text style={styles.accentText}>
          会话保存在本机安全存储；换账号前请先退出，避免数据串扰。
        </Text>
      </View>

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
            textContentType="username"
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
            textContentType="password"
            editable={!pending && Platform.OS !== "web"}
            style={styles.input}
          />
        </View>
        {error ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {error}
          </Text>
        ) : null}
        {Platform.OS === "web" ? (
          <Text style={styles.notice}>
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
  heading: { gap: spacing.xs },
  brand: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    letterSpacing: 2,
    fontWeight: "600",
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.pageTitle,
    fontWeight: "700",
  },
  lead: {
    color: colors.muted,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  accent: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.card,
    gap: spacing.xxs,
  },
  accentTitle: {
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: "600",
  },
  accentText: {
    color: colors.text,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
  field: { gap: spacing.xs },
  label: {
    color: colors.text,
    fontSize: fontSizes.caption,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.input,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: controlSizes.minHeight,
    fontSize: fontSizes.input,
    color: colors.text,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  notice: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
});

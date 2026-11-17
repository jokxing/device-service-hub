import { useNativeSession } from "../auth/sessionContext";
import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import {
  colors,
  fontSizes,
  spacing,
  lineHeights,
  radii,
} from "../../shared/theme";
import { SERVICE_STEPS } from "./content";

export default function HomeScreen() {
  const router = useRouter();
  const { user } = useNativeSession();
  return (
    <Screen dense safeTop>
      <View style={styles.heading}>
        <Text style={styles.brand}>DEVICE SERVICE HUB</Text>
        <Text accessibilityRole="header" style={styles.title}>
          设备服务
        </Text>
        <Text style={styles.subtitle}>让每一次报修都有回应</Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>从发现问题，到恢复运行</Text>
        <Text style={styles.heroText}>
          清晰的设备信息、可追踪的维修进度，让服务协作更有条理。
        </Text>
      </View>

      <ActionButton
        title="进入设备服务"
        onPress={() =>
          router.push(user?.role === "technician" ? "/tasks" : "/devices")
        }
      />
      <ActionButton
        title="查看报修须知"
        secondary
        compact
        onPress={() => router.push("/guide")}
      />

      <ContentCard title="服务流程">
        {SERVICE_STEPS.map((step, index) => (
          <View key={step.title} style={styles.step}>
            <View style={styles.number}>
              <Text style={styles.numberText}>{index + 1}</Text>
            </View>
            <View style={styles.stepBody}>
              <Text style={styles.stepTitle}>{step.title}</Text>
              <Text style={styles.description}>{step.description}</Text>
            </View>
          </View>
        ))}
      </ContentCard>

      <Text style={styles.notice}>
        当前支持登录、授权设备查询、扫码核对、文字报修、现场照片、本人记录与订单跟进；管理员分派请使用
        Web 后台。
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  heading: { gap: spacing.xxs },
  brand: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    letterSpacing: 2,
    fontWeight: "600",
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.title,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.muted,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  hero: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.card,
    gap: spacing.xxs,
  },
  heroTitle: {
    color: colors.primary,
    fontSize: fontSizes.section,
    fontWeight: "600",
  },
  heroText: {
    color: colors.text,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  number: {
    width: 28,
    height: 28,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.badge,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  numberText: {
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: "600",
  },
  stepBody: { flex: 1, minWidth: 0, gap: spacing.xxs },
  stepTitle: {
    color: colors.text,
    fontSize: fontSizes.body,
    fontWeight: "600",
  },
  description: {
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

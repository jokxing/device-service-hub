import { useRouter } from "expo-router";
import { StyleSheet, Text, View } from "react-native";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import { colors, fontSizes, spacing } from "../../shared/theme";
import { SERVICE_STEPS } from "./content";

export default function HomeScreen() {
  const router = useRouter();
  return (
    <Screen safeTop>
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
        onPress={() => router.push("/devices")}
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
      <ActionButton
        title="查看报修须知"
        secondary
        onPress={() => router.push("/guide")}
      />
      <Text style={styles.notice}>
        当前支持账号登录与授权设备查询，报修和拍照上传将在后续版本接入。
      </Text>
    </Screen>
  );
}
const styles = StyleSheet.create({
  heading: { gap: spacing.xs, paddingTop: spacing.sm },
  brand: { color: colors.muted, fontSize: fontSizes.caption, letterSpacing: 2 },
  title: { color: colors.text, fontSize: fontSizes.title, fontWeight: "700" },
  subtitle: { color: colors.muted, fontSize: fontSizes.body, lineHeight: 24 },
  hero: {
    padding: spacing.lg,
    backgroundColor: colors.primarySoft,
    borderRadius: 14,
    gap: spacing.sm,
  },
  heroTitle: {
    color: colors.primary,
    fontSize: fontSizes.section,
    fontWeight: "600",
  },
  heroText: { color: colors.text, fontSize: fontSizes.body, lineHeight: 25 },
  step: { flexDirection: "row", alignItems: "flex-start", gap: spacing.sm },
  number: {
    width: 30,
    height: 30,
    backgroundColor: colors.primarySoft,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  numberText: {
    color: colors.primary,
    fontSize: fontSizes.body,
    fontWeight: "600",
  },
  stepBody: { flex: 1, gap: 4 },
  stepTitle: {
    color: colors.text,
    fontSize: fontSizes.body,
    fontWeight: "600",
  },
  description: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: 22,
  },
  notice: { color: colors.muted, fontSize: fontSizes.caption, lineHeight: 22 },
});

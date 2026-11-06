import type { PropsWithChildren } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, spacing, radii } from "../theme";

export default function ContentCard({
  title,
  children,
}: PropsWithChildren<{ title: string }>) {
  return (
    <View style={styles.card}>
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {children}
    </View>
  );
}
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    gap: spacing.md,
  },
  title: { color: colors.text, fontSize: fontSizes.section, fontWeight: "600" },
});

import type { PropsWithChildren, ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, fontSizes, spacing, radii } from "../theme";

export default function ContentCard({
  title,
  eyebrow,
  extra,
  children,
}: PropsWithChildren<{
  title: string;
  eyebrow?: string;
  extra?: ReactNode;
}>) {
  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.heading}>
          {eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}
          <Text accessibilityRole="header" style={styles.title}>
            {title}
          </Text>
        </View>
        {extra ? <View style={styles.extra}>{extra}</View> : null}
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  heading: {
    flex: 1,
    minWidth: 0,
    gap: spacing.xxs,
  },
  eyebrow: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: 18,
  },
  title: {
    color: colors.text,
    fontSize: fontSizes.section,
    fontWeight: "600",
    flexShrink: 1,
  },
  extra: {
    flexShrink: 0,
    alignItems: "flex-end",
  },
});

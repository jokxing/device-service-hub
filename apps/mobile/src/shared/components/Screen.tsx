import type { PropsWithChildren, ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, spacing } from "../theme";

export default function Screen({
  children,
  safeTop = false,
  footer,
  dense = false,
}: PropsWithChildren<{
  safeTop?: boolean;
  footer?: ReactNode;
  dense?: boolean;
}>) {
  return (
    <SafeAreaView
      style={styles.safe}
      edges={
        safeTop
          ? ["top", "left", "right", "bottom"]
          : ["left", "right", "bottom"]
      }
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentContainerStyle={[
          styles.content,
          dense && styles.dense,
          footer != null && styles.fill,
        ]}
      >
        {children}
        {footer != null && <View style={styles.footer}>{footer}</View>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  fill: { flexGrow: 1 },
  footer: { marginTop: "auto", gap: spacing.sm, paddingTop: spacing.md },
  content: {
    width: "100%",
    maxWidth: 640,
    alignSelf: "center",
    padding: spacing.lg,
    gap: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  dense: {
    padding: spacing.md,
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
});

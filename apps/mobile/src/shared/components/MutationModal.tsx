import type { PropsWithChildren } from "react";
import { Modal, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import ActionButton from "./ActionButton";
import { colors, fontSizes, lineHeights, spacing, radii } from "../theme";

export default function MutationModal({
  title,
  submitText,
  pending,
  error,
  onSubmit,
  onClose,
  children,
}: PropsWithChildren<{
  title: string;
  submitText: string;
  pending: boolean;
  error: string;
  onSubmit: () => void;
  onClose: () => void;
}>) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible
      onRequestClose={() => {
        if (!pending) onClose();
      }}
    >
      <SafeAreaView style={styles.overlay}>
        <View accessibilityViewIsModal style={styles.panel}>
          <ScrollView
            contentContainerStyle={styles.content}
            keyboardShouldPersistTaps="handled"
          >
            <Text accessibilityRole="header" style={styles.title}>
              {title}
            </Text>
            {children}
            {!!error && (
              <Text accessibilityRole="alert" style={styles.error}>
                {error}
              </Text>
            )}
            <ActionButton
              title={submitText}
              pending={pending}
              onPress={onSubmit}
            />
            <ActionButton
              title="取消"
              secondary
              disabled={pending}
              onPress={onClose}
            />
          </ScrollView>
        </View>
      </SafeAreaView>
    </Modal>
  );
}
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.scrim,
    padding: spacing.lg,
    justifyContent: "center",
    alignItems: "center",
  },
  panel: {
    width: "100%",
    maxWidth: 640,
    maxHeight: "100%",
    backgroundColor: colors.surface,
    borderRadius: radii.card,
    overflow: "hidden",
  },
  content: { padding: spacing.lg, gap: spacing.lg },
  title: { color: colors.text, fontSize: fontSizes.section, fontWeight: "600" },
  error: {
    color: colors.danger,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
});

import { Pressable, StyleSheet, Text } from "react-native";
import { colors, controlSizes, fontSizes, spacing } from "../theme";

export default function HeaderRefreshButton({
  onPress,
  disabled = false,
  accessibilityLabel = "刷新",
}: {
  onPress: () => void;
  disabled?: boolean;
  accessibilityLabel?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.button,
        (pressed || disabled) && styles.faded,
      ]}
    >
      <Text style={styles.icon}>↻</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minWidth: controlSizes.compactHeight,
    minHeight: controlSizes.minHeight,
    paddingHorizontal: spacing.xs,
    marginRight: spacing.xs,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    color: colors.primary,
    fontSize: fontSizes.section,
    fontWeight: "600",
    lineHeight: fontSizes.section + 2,
  },
  faded: { opacity: 0.45 },
});

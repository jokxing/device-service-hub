import { Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes, radii, spacing, controlSizes } from "../theme";

export default function FilterChip({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.chip,
        active && styles.chipActive,
        pressed && { opacity: 0.7 },
      ]}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.badge,
    minHeight: controlSizes.compactHeight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: "center",
  },
  chipActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: "600",
  },
  chipTextActive: {
    color: colors.surface,
  },
});

import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes, spacing, radii, controlSizes } from "../theme";

export default function ActionButton({
  title,
  onPress,
  disabled = false,
  pending = false,
  secondary = false,
  compact = false,
  fill = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  secondary?: boolean;
  compact?: boolean;
  fill?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        compact && styles.compact,
        fill && styles.fill,
        secondary && styles.secondary,
        (pressed || disabled || pending) && styles.faded,
      ]}
    >
      {pending && (
        <ActivityIndicator
          color={secondary ? colors.primary : colors.surface}
        />
      )}
      <Text
        style={[
          styles.text,
          compact && styles.compactText,
          secondary && styles.secondaryText,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.primary,
    borderRadius: radii.control,
    minHeight: controlSizes.minHeight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  compact: {
    minHeight: controlSizes.compactHeight,
    paddingVertical: spacing.xs,
  },
  fill: { flex: 1 },
  text: { color: colors.surface, fontSize: fontSizes.body, fontWeight: "600" },
  compactText: { fontSize: fontSizes.caption },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.primary },
  faded: { opacity: 0.65 },
});

import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { colors, fontSizes, spacing, radii, controlSizes } from "../theme";
export default function ActionButton({
  title,
  onPress,
  disabled = false,
  pending = false,
  secondary = false,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  pending?: boolean;
  secondary?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || pending}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        secondary && styles.secondary,
        (pressed || disabled || pending) && styles.faded,
      ]}
    >
      {pending && (
        <ActivityIndicator
          color={secondary ? colors.primary : colors.surface}
        />
      )}
      <Text style={[styles.text, secondary && styles.secondaryText]}>
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
    padding: spacing.sm,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: spacing.xs,
  },
  text: { color: colors.surface, fontSize: fontSizes.body, fontWeight: "600" },
  secondary: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryText: { color: colors.primary },
  faded: { opacity: 0.65 },
});

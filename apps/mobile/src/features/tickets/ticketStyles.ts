import { typography } from "../../shared/styles/typography";
import { StyleSheet } from "react-native";
import {
  colors,
  spacing,
  fontSizes,
  radii,
  controlSizes,
} from "../../shared/theme";
export const ticketStyles = StyleSheet.create({
  ...typography,
  input: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.input,
    minHeight: controlSizes.minHeight,
    padding: spacing.sm,
    fontSize: fontSizes.input,
  },
  description: { minHeight: 120, textAlignVertical: "top" },
  field: { gap: spacing.xs },
});

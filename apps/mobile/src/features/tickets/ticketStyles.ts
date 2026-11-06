import { StyleSheet } from "react-native";
import {
  colors,
  spacing,
  fontSizes,
  lineHeights,
  radii,
  controlSizes,
} from "../../shared/theme";
export const ticketStyles = StyleSheet.create({
  text: {
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.relaxed,
  },
  muted: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
  error: {
    color: colors.danger,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
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

import { StyleSheet } from "react-native";
import { colors, fontSizes, spacing, lineHeights } from "../../shared/theme";
export const deviceStyles = StyleSheet.create({
  identity: { color: colors.muted, fontSize: fontSizes.body },
  text: {
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.relaxed,
  },
  code: { color: colors.primary, fontSize: fontSizes.caption },
  error: {
    color: colors.danger,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  fields: { gap: spacing.sm },
});

import { StyleSheet } from "react-native";
import { colors, fontSizes, lineHeights } from "../theme";
export const typography = StyleSheet.create({
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
});

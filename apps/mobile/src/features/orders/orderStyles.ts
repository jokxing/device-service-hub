import { StyleSheet } from "react-native";
import {
  colors,
  fontSizes,
  lineHeights,
  radii,
  spacing,
} from "../../shared/theme";

export const orderStyles = StyleSheet.create({
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  list: { gap: spacing.sm },
  meta: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
  amount: {
    color: colors.text,
    fontSize: fontSizes.caption,
    fontWeight: "600",
    lineHeight: lineHeights.caption,
  },
  status: {
    borderRadius: radii.badge,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    overflow: "hidden",
  },
  statusSuccess: { backgroundColor: colors.successSoft },
  statusDanger: { backgroundColor: colors.dangerSoft },
  statusNeutral: { backgroundColor: colors.primarySoft },
  statusText: { fontSize: fontSizes.caption, fontWeight: "600" },
  statusSuccessText: { color: colors.success },
  statusDangerText: { color: colors.danger },
  statusNeutralText: { color: colors.primary },
  detailLink: {
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: "600",
    paddingVertical: spacing.xxs,
  },
});

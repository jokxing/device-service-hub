import { StyleSheet } from "react-native";
import {
  colors,
  fontSizes,
  spacing,
  lineHeights,
  radii,
  controlSizes,
} from "../../shared/theme";

export const deviceStyles = StyleSheet.create({
  identityCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.card,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xxs,
  },
  identityName: {
    color: colors.text,
    fontSize: fontSizes.section,
    fontWeight: "600",
  },
  identityRole: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
  primaryNav: {
    gap: spacing.sm,
  },
  secondaryNav: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  secondaryChip: {
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.badge,
    minHeight: controlSizes.compactHeight,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    justifyContent: "center",
  },
  secondaryChipText: {
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: "600",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: fontSizes.body,
    fontWeight: "600",
  },
  sectionCount: {
    color: colors.muted,
    fontSize: fontSizes.caption,
  },
  identity: { color: colors.muted, fontSize: fontSizes.body },
  text: {
    color: colors.text,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.relaxed,
  },
  meta: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: lineHeights.caption,
  },
  code: { color: colors.muted, fontSize: fontSizes.caption },
  error: {
    color: colors.danger,
    fontSize: fontSizes.body,
    lineHeight: lineHeights.body,
  },
  fields: { gap: spacing.xs },
  status: {
    borderRadius: radii.badge,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    overflow: "hidden",
  },
  statusEnabled: {
    backgroundColor: colors.successSoft,
  },
  statusDisabled: {
    backgroundColor: colors.dangerSoft,
  },
  statusText: {
    fontSize: fontSizes.caption,
    fontWeight: "600",
  },
  statusEnabledText: {
    color: colors.success,
  },
  statusDisabledText: {
    color: colors.danger,
  },
  detailLink: {
    color: colors.primary,
    fontSize: fontSizes.caption,
    fontWeight: "600",
    paddingVertical: spacing.xxs,
  },
  list: {
    gap: spacing.sm,
  },
});

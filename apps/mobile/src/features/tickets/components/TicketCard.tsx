import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TicketRecord } from "@device-service-hub/contracts";
import ContentCard from "../../../shared/components/ContentCard";
import { formatDateTime } from "../../../shared/utils/date";
import { colors, fontSizes, radii, spacing } from "../../../shared/theme";
import { typography as styles } from "../../../shared/styles/typography";
import { STATUS_LABELS, PRIORITY_LABELS } from "../constants";

function statusTone(status: TicketRecord["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  return "neutral" as const;
}

export default function TicketCard({
  ticket,
  onView,
  viewLabel = "查看报修详情",
}: {
  ticket: TicketRecord;
  onView: () => void;
  viewLabel?: string;
}) {
  const tone = statusTone(ticket.status);
  return (
    <ContentCard
      eyebrow={ticket.code}
      title={ticket.title}
      extra={
        <View
          style={[
            card.status,
            tone === "success" && card.statusSuccess,
            tone === "danger" && card.statusDanger,
            tone === "neutral" && card.statusNeutral,
          ]}
        >
          <Text
            style={[
              card.statusText,
              tone === "success" && card.statusSuccessText,
              tone === "danger" && card.statusDangerText,
              tone === "neutral" && card.statusNeutralText,
            ]}
          >
            {STATUS_LABELS[ticket.status]}
          </Text>
        </View>
      }
    >
      <Text style={styles.muted}>
        {ticket.device.code} · {ticket.device.name}
      </Text>
      <Text style={styles.muted}>
        {PRIORITY_LABELS[ticket.priority]} · {formatDateTime(ticket.createdAt)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={viewLabel}
        onPress={onView}
      >
        <Text style={card.detailLink}>{viewLabel}</Text>
      </Pressable>
    </ContentCard>
  );
}

const card = StyleSheet.create({
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

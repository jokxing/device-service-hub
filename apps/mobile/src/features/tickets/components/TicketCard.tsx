import { Text } from "react-native";
import type { TicketRecord } from "@device-service-hub/contracts";
import ContentCard from "../../../shared/components/ContentCard";
import ActionButton from "../../../shared/components/ActionButton";
import { STATUS_LABELS, PRIORITY_LABELS } from "../constants";
import { typography as styles } from "../../../shared/styles/typography";
export default function TicketCard({
  ticket,
  onView,
  viewLabel = "查看报修详情",
}: {
  ticket: TicketRecord;
  onView: () => void;
  viewLabel?: string;
}) {
  return (
    <ContentCard title={ticket.title}>
      <Text style={styles.muted}>{ticket.code}</Text>
      <Text style={styles.text}>
        {STATUS_LABELS[ticket.status]} · {PRIORITY_LABELS[ticket.priority]}
      </Text>
      <Text style={styles.text}>
        {ticket.device.code} · {ticket.device.name}
      </Text>
      <Text style={styles.muted}>
        {new Date(ticket.createdAt).toLocaleString("zh-CN")}
      </Text>
      <ActionButton title={viewLabel} secondary onPress={onView} />
    </ContentCard>
  );
}

import { Text } from "react-native";
import type { TicketRecord } from "@device-service-hub/contracts";
import ContentCard from "../../../shared/components/ContentCard";
import { STATUS_LABELS, PRIORITY_LABELS } from "../constants";
import { ticketStyles as styles } from "../ticketStyles";
/** Shared read-only work-order content; no role actions or API access. */
export default function TicketRecordDetails({
  ticket,
}: {
  ticket: TicketRecord;
}) {
  return (
    <>
      <ContentCard title={ticket.title}>
        <Text style={styles.muted}>{ticket.code}</Text>
        <Text style={styles.text}>状态：{STATUS_LABELS[ticket.status]}</Text>
        <Text style={styles.text}>
          优先级：{PRIORITY_LABELS[ticket.priority]}
        </Text>
        <Text style={styles.text}>
          设备：{ticket.device.code} · {ticket.device.name}
        </Text>
        <Text style={styles.text}>位置：{ticket.device.location}</Text>
        <Text style={styles.text}>问题描述：{ticket.description}</Text>
        <Text style={styles.muted}>
          提交时间：{new Date(ticket.createdAt).toLocaleString("zh-CN")}
        </Text>
      </ContentCard>
      <ContentCard title="处理记录">
        <Text style={styles.text}>
          维修人员：{ticket.assignee?.name ?? "待分派"}
        </Text>
        {ticket.assignedAt && (
          <Text style={styles.text}>
            分派：{new Date(ticket.assignedAt).toLocaleString("zh-CN")}
          </Text>
        )}
        {ticket.acceptance && (
          <Text style={styles.text}>
            接单：{ticket.acceptance.actor.name} ·{" "}
            {new Date(ticket.acceptance.createdAt).toLocaleString("zh-CN")}
          </Text>
        )}
        {ticket.result && (
          <Text style={styles.text}>
            处理结果：{ticket.result.description}（{ticket.result.actor.name} ·{" "}
            {new Date(ticket.result.createdAt).toLocaleString("zh-CN")}）
          </Text>
        )}
        {ticket.confirmation && (
          <Text style={styles.text}>
            确认完成：{ticket.confirmation.actor.name} ·{" "}
            {new Date(ticket.confirmation.createdAt).toLocaleString("zh-CN")}
          </Text>
        )}
        {!ticket.assignedAt && (
          <Text style={styles.muted}>报修已提交，等待管理员分派。</Text>
        )}
      </ContentCard>
    </>
  );
}

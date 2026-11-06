import { useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import { useMyTickets } from "./useTickets";
import { STATUS_LABELS, PRIORITY_LABELS } from "./constants";
import { ticketStyles as styles } from "./ticketStyles";
import ReporterAccess from "./components/ReporterAccess";
import LoadFeedback from "./components/LoadFeedback";
function TicketList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useMyTickets(page);
  return (
    <Screen>
      <LoadFeedback loading={loading} error={error} />
      {data && (
        <Text style={styles.muted}>
          共 {data.total} 条本人报修 · 第 {data.page} 页
        </Text>
      )}
      {data?.items.length === 0 && (
        <Text style={styles.text}>暂无报修记录</Text>
      )}
      {data?.items.map((ticket) => (
        <ContentCard key={ticket.id} title={ticket.title}>
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
          <ActionButton
            title="查看报修详情"
            secondary
            onPress={() => router.push(`/tickets/${ticket.id}`)}
          />
        </ContentCard>
      ))}
      <ActionButton
        title="刷新报修"
        secondary
        disabled={loading}
        onPress={reload}
      />
      <ActionButton
        title="上一页"
        secondary
        disabled={loading || page <= 1}
        onPress={() => setPage((value) => value - 1)}
      />
      <ActionButton
        title="下一页"
        secondary
        disabled={loading || !data || page * data.pageSize >= data.total}
        onPress={() => setPage((value) => value + 1)}
      />
      <ActionButton
        title="返回我的设备"
        secondary
        onPress={() => router.replace("/devices")}
      />
    </Screen>
  );
}
export default function MyTicketsScreen() {
  return (
    <ReporterAccess>
      <TicketList />
    </ReporterAccess>
  );
}

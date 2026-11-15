import TicketCard from "./components/TicketCard";
import { useState } from "react";
import { Text } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import Pagination from "../../shared/components/Pagination";
import ActionButton from "../../shared/components/ActionButton";
import { useMyTickets } from "./useTickets";
import { ticketStyles as styles } from "./ticketStyles";
import ReporterAccess from "./components/ReporterAccess";
import LoadFeedback from "../../shared/components/LoadFeedback";
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
        <TicketCard
          key={ticket.id}
          ticket={ticket}
          onView={() => router.push(`/tickets/${ticket.id}`)}
        />
      ))}
      <ActionButton
        title="刷新报修"
        secondary
        disabled={loading}
        onPress={reload}
      />
      <Pagination
        page={page}
        pagination={data}
        loading={loading}
        onPageChange={setPage}
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

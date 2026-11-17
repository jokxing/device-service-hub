import RecordListHeader from "../../shared/components/RecordListHeader";
import { useRefreshOnFocus } from "../../shared/hooks/useRefreshOnFocus";
import TicketCard from "./components/TicketCard";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../../shared/components/Screen";
import Pagination from "../../shared/components/Pagination";
import ContentCard from "../../shared/components/ContentCard";
import LoadFeedback from "../../shared/components/LoadFeedback";
import { colors, fontSizes, spacing } from "../../shared/theme";
import { useMyTickets } from "./useTickets";
import ReporterAccess from "./components/ReporterAccess";

function TicketList() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useMyTickets(page);
  useRefreshOnFocus(reload);
  const items = data?.items ?? [];
  const empty = !!data && items.length === 0;
  return (
    <Screen dense>
      <RecordListHeader
        title="本人报修"
        summary={
          data && !error
            ? `共 ${data.total} 条 · 第 ${data.page} 页`
            : undefined
        }
        refreshLabel="刷新报修"
        loading={loading}
        onRefresh={reload}
      />

      <LoadFeedback
        loading={loading && items.length === 0}
        error={error}
        loadingLabel="正在读取报修…"
        onRetry={reload}
        retryLabel="刷新报修"
      />

      {empty ? (
        <ContentCard title="暂无报修记录">
          <Text style={layout.meta}>
            可从「我的设备」选择授权设备后发起文字报修，提交成功后会显示在此列表。
          </Text>
        </ContentCard>
      ) : null}

      {items.length > 0 ? (
        <View style={layout.list}>
          {items.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onView={() => router.push(`/tickets/${ticket.id}`)}
            />
          ))}
        </View>
      ) : null}

      {data ? (
        <Pagination
          page={page}
          pagination={data}
          loading={loading}
          onPageChange={setPage}
        />
      ) : null}
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

const layout = StyleSheet.create({
  meta: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: 22,
  },
  list: { gap: spacing.sm },
});

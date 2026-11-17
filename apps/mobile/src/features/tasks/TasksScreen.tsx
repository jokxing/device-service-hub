import RecordListHeader from "../../shared/components/RecordListHeader";
import { useRefreshOnFocus } from "../../shared/hooks/useRefreshOnFocus";
import { ROLE_LABELS } from "../../shared/constants/roles";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import type { TicketStatus } from "@device-service-hub/contracts";
import Screen from "../../shared/components/Screen";
import Pagination from "../../shared/components/Pagination";
import ContentCard from "../../shared/components/ContentCard";
import FilterChip from "../../shared/components/FilterChip";
import LoadFeedback from "../../shared/components/LoadFeedback";
import { colors, fontSizes, radii, spacing } from "../../shared/theme";
import { useNativeSession } from "../auth/sessionContext";
import TicketCard from "../tickets/components/TicketCard";
import { STATUS_LABELS } from "../tickets/constants";
import { useTasks } from "./useTasks";
import TechnicianAccess from "./TechnicianAccess";
import { TASK_FILTERS } from "./constants";

function Tasks() {
  const { user } = useNativeSession();
  const router = useRouter();
  const [query, setQuery] = useState<{ page: number; status?: TicketStatus }>({
    page: 1,
  });
  const { data, error, loading, reload } = useTasks(query.page, query.status);
  const items = data?.items ?? [];
  const empty = !!data && items.length === 0;
  useRefreshOnFocus(reload);
  return (
    <Screen dense>
      <View style={layout.identity}>
        <Text style={layout.identityName}>{user?.name}</Text>
        <Text style={layout.identityRole}>{ROLE_LABELS.technician}</Text>
      </View>

      <RecordListHeader
        title="本人任务"
        summary={
          data && !error
            ? `共 ${data.total} 条 · 第 ${data.page} 页${query.status ? ` · ${STATUS_LABELS[query.status]}` : ""}`
            : undefined
        }
        refreshLabel="刷新任务"
        loading={loading}
        onRefresh={reload}
      />

      <View style={layout.filters}>
        <FilterChip
          title="全部任务"
          active={!query.status}
          onPress={() => setQuery({ page: 1 })}
        />
        {TASK_FILTERS.map((status) => (
          <FilterChip
            key={status}
            title={STATUS_LABELS[status]}
            active={query.status === status}
            onPress={() => setQuery({ page: 1, status })}
          />
        ))}
      </View>

      <LoadFeedback
        loading={loading && items.length === 0}
        error={error}
        loadingLabel="正在读取任务…"
        onRetry={reload}
        retryLabel="刷新任务"
      />

      {empty ? (
        <ContentCard title="暂无任务">
          <Text style={layout.meta}>
            {query.status
              ? "当前筛选下没有任务，可切换状态或查看全部任务。"
              : "管理员分派后，当前账号的维修任务会出现在此列表。"}
          </Text>
        </ContentCard>
      ) : null}

      {items.length > 0 ? (
        <View style={layout.list}>
          {items.map((task) => (
            <TicketCard
              key={task.id}
              ticket={task}
              viewLabel="查看任务详情"
              onView={() => router.push(`/tasks/${task.id}`)}
            />
          ))}
        </View>
      ) : null}

      {data ? (
        <Pagination
          page={query.page}
          pagination={data}
          loading={loading}
          onPageChange={(nextPage) =>
            setQuery((value) => ({ ...value, page: nextPage }))
          }
        />
      ) : null}
    </Screen>
  );
}

export default function TasksScreen() {
  return (
    <TechnicianAccess>
      <Tasks />
    </TechnicianAccess>
  );
}

const layout = StyleSheet.create({
  identity: {
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
  },
  filters: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  list: { gap: spacing.sm },
  meta: {
    color: colors.muted,
    fontSize: fontSizes.caption,
    lineHeight: 22,
  },
});

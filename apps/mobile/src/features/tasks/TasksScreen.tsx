import { ROLE_LABELS } from "../../shared/constants/roles";
import { useCallback, useRef, useState } from "react";
import { ScrollView, StyleSheet, Text } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import type { TicketStatus } from "@device-service-hub/contracts";
import Screen from "../../shared/components/Screen";
import ActionButton from "../../shared/components/ActionButton";
import { typography as styles } from "../../shared/styles/typography";
import { spacing } from "../../shared/theme";
import { useNativeSession } from "../auth/sessionContext";
import TicketCard from "../tickets/components/TicketCard";
import LoadFeedback from "../../shared/components/LoadFeedback";
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
  const firstFocus = useRef(true);
  useFocusEffect(
    useCallback(() => {
      if (firstFocus.current) firstFocus.current = false;
      else reload();
    }, [reload]),
  );
  return (
    <Screen>
      <Text style={styles.text}>
        {user?.name} · {ROLE_LABELS.technician}
      </Text>
      <Text style={styles.muted}>
        当前筛选：{query.status ? STATUS_LABELS[query.status] : "全部任务"}
      </Text>
      <ScrollView
        horizontal
        style={layout.filterViewport}
        contentContainerStyle={layout.filters}
        showsHorizontalScrollIndicator={false}
      >
        <ActionButton
          title="全部任务"
          secondary={!!query.status}
          onPress={() => setQuery({ page: 1 })}
        />
        {TASK_FILTERS.map((status) => (
          <ActionButton
            key={status}
            title={STATUS_LABELS[status]}
            secondary={query.status !== status}
            onPress={() => setQuery({ page: 1, status })}
          />
        ))}
      </ScrollView>
      <LoadFeedback loading={loading} error={error} />
      {data && (
        <Text style={styles.muted}>
          共 {data.total} 条本人任务 · 第 {data.page} 页
        </Text>
      )}
      {data?.items.length === 0 && (
        <Text style={styles.text}>当前筛选下暂无任务</Text>
      )}
      {data?.items.map((task) => (
        <TicketCard
          key={task.id}
          ticket={task}
          viewLabel="查看任务详情"
          onView={() => router.push(`/tasks/${task.id}`)}
        />
      ))}
      <ActionButton
        title="刷新任务"
        secondary
        disabled={loading}
        onPress={reload}
      />
      <ActionButton
        title="上一页"
        secondary
        disabled={loading || query.page <= 1}
        onPress={() =>
          setQuery((value) => ({ ...value, page: value.page - 1 }))
        }
      />
      <ActionButton
        title="下一页"
        secondary
        disabled={loading || !data || query.page * data.pageSize >= data.total}
        onPress={() =>
          setQuery((value) => ({ ...value, page: value.page + 1 }))
        }
      />
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
  filterViewport: { flexGrow: 0 },
  filters: { gap: spacing.xs },
});

import RecordListHeader from "../../shared/components/RecordListHeader";
import { useRefreshOnFocus } from "../../shared/hooks/useRefreshOnFocus";
import { formatDateTime } from "../../shared/utils/date";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import type { ServiceOrderSummary } from "@device-service-hub/contracts";
import {
  readOrderStatus,
  orderListQuery,
  ORDER_STATUSES,
  ORDER_PAGINATION,
} from "@device-service-hub/contracts/order-rules";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import Screen from "../../shared/components/Screen";
import Pagination from "../../shared/components/Pagination";
import ContentCard from "../../shared/components/ContentCard";
import FilterChip from "../../shared/components/FilterChip";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ReporterAccess from "../tickets/components/ReporterAccess";
import { ORDER_STATUS_LABELS } from "./constants";
import { useOrders } from "./useOrders";
import { orderStyles as styles } from "./orderStyles";

function statusTone(status: ServiceOrderSummary["status"]) {
  if (status === "completed") return "success" as const;
  if (status === "cancelled") return "danger" as const;
  return "neutral" as const;
}

function OrderCard({
  order,
  onView,
}: {
  order: ServiceOrderSummary;
  onView: () => void;
}) {
  const tone = statusTone(order.status);
  return (
    <ContentCard
      eyebrow={order.ticket.title}
      title={order.code}
      extra={
        <View
          style={[
            styles.status,
            tone === "success" && styles.statusSuccess,
            tone === "danger" && styles.statusDanger,
            tone === "neutral" && styles.statusNeutral,
          ]}
        >
          <Text
            style={[
              styles.statusText,
              tone === "success" && styles.statusSuccessText,
              tone === "danger" && styles.statusDangerText,
              tone === "neutral" && styles.statusNeutralText,
            ]}
          >
            {ORDER_STATUS_LABELS[order.status]}
          </Text>
        </View>
      }
    >
      <Text style={styles.meta}>
        {order.ticket.device.name} · {order.ticket.device.location}
      </Text>
      <Text style={styles.amount}>¥{formatCents(order.totalCents)}</Text>
      <Text style={styles.meta}>{formatDateTime(order.createdAt)}</Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="查看订单详情"
        onPress={onView}
      >
        <Text style={styles.detailLink}>查看订单详情</Text>
      </Pressable>
    </ContentCard>
  );
}

function List() {
  const params = useLocalSearchParams<{ page?: string; status?: string }>(),
    router = useRouter();
  const raw = Number(params.page),
    page =
      Number.isInteger(raw) && raw > 0 && raw <= ORDER_PAGINATION.maxPage
        ? raw
        : 1,
    status = readOrderStatus(params.status);
  const query = orderListQuery(page, status);
  const { data: response, loading, error, reload } = useOrders(query);
  useRefreshOnFocus(reload);
  const data = response?.query === query ? response : null;
  const items = data?.items ?? [];
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  const empty = !!data && items.length === 0;
  useEffect(() => {
    if (data && page > pages) router.setParams({ page: String(pages) });
  }, [data, page, pages, router]);
  return (
    <Screen dense>
      <RecordListHeader
        title="本人订单"
        summary={
          data && !error
            ? `共 ${data.total} 条 · 第 ${page} 页${status ? ` · ${ORDER_STATUS_LABELS[status]}` : ""}`
            : undefined
        }
        refreshLabel="刷新订单"
        loading={loading}
        onRefresh={reload}
      />

      <View style={styles.filters}>
        <FilterChip
          title="全部订单"
          active={!status}
          onPress={() => router.setParams({ status: "", page: "1" })}
        />
        {ORDER_STATUSES.map((value) => (
          <FilterChip
            key={value}
            title={ORDER_STATUS_LABELS[value]}
            active={status === value}
            onPress={() => router.setParams({ status: value, page: "1" })}
          />
        ))}
      </View>

      <LoadFeedback
        loading={loading && items.length === 0}
        error={error}
        loadingLabel="正在读取订单…"
        onRetry={reload}
        retryLabel="刷新订单"
      />

      {empty ? (
        <ContentCard title="暂无订单">
          <Text style={styles.meta}>
            {status
              ? "当前筛选下没有订单，可切换状态或查看全部订单。"
              : "确认报价并生成订单后，记录会出现在此列表。"}
          </Text>
        </ContentCard>
      ) : null}

      {items.length > 0 ? (
        <View style={styles.list}>
          {items.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              onView={() => router.push(`/orders/${order.id}`)}
            />
          ))}
        </View>
      ) : null}

      {data ? (
        <Pagination
          page={page}
          pagination={data}
          loading={loading}
          onPageChange={(nextPage) =>
            router.setParams({ page: String(nextPage) })
          }
        />
      ) : null}
    </Screen>
  );
}

export default function OrdersScreen() {
  return (
    <ReporterAccess>
      <List />
    </ReporterAccess>
  );
}

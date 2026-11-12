import { formatDateTime } from "../../shared/utils/date";
import { useEffect } from "react";
import { Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  readOrderStatus,
  orderListQuery,
  ORDER_STATUSES,
  ORDER_PAGINATION,
} from "@device-service-hub/contracts/order-rules";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import Screen from "../../shared/components/Screen";
import ContentCard from "../../shared/components/ContentCard";
import ActionButton from "../../shared/components/ActionButton";
import LoadFeedback from "../../shared/components/LoadFeedback";
import ReporterAccess from "../tickets/components/ReporterAccess";
import { spacing } from "../../shared/theme";
import { typography } from "../../shared/styles/typography";
import { ORDER_STATUS_LABELS } from "./constants";
import { useOrders } from "./useOrders";
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
  const data = response?.query === query ? response : null;
  const pages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1;
  useEffect(() => {
    if (data && page > pages) router.setParams({ page: String(pages) });
  }, [data, page, pages, router]);
  return (
    <Screen>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
        <ActionButton
          title="全部订单"
          secondary={!!status}
          onPress={() => router.setParams({ status: "", page: "1" })}
        />
        {ORDER_STATUSES.map((value) => (
          <ActionButton
            key={value}
            title={ORDER_STATUS_LABELS[value]}
            secondary={status !== value}
            onPress={() => router.setParams({ status: value, page: "1" })}
          />
        ))}
      </View>
      <ActionButton
        title="刷新订单"
        secondary
        disabled={loading}
        onPress={reload}
      />
      <LoadFeedback loading={loading} error={error} />
      {data && (
        <Text style={typography.muted}>
          共 {data.total} 条本人订单 · 第 {page} 页
        </Text>
      )}
      {data?.items.length === 0 && (
        <Text style={typography.text}>暂无订单</Text>
      )}
      {data?.items.map((order) => (
        <ContentCard key={order.id} title={order.code}>
          <Text style={typography.text}>
            {order.ticket.title} · {ORDER_STATUS_LABELS[order.status]}
          </Text>
          <Text style={typography.text}>
            {order.ticket.device.name} · {order.ticket.device.location}
          </Text>
          <Text style={typography.text}>
            订单金额：¥{formatCents(order.totalCents)}
          </Text>
          <Text style={typography.text}>
            创建时间：{formatDateTime(order.createdAt)}
          </Text>
          <ActionButton
            title="查看订单详情"
            secondary
            onPress={() => router.push(`/orders/${order.id}`)}
          />
        </ContentCard>
      ))}
      {data && (
        <>
          <ActionButton
            title="上一页"
            secondary
            disabled={loading || page <= 1}
            onPress={() => router.setParams({ page: String(page - 1) })}
          />
          <ActionButton
            title="下一页"
            secondary
            disabled={loading || page >= pages}
            onPress={() => router.setParams({ page: String(page + 1) })}
          />
        </>
      )}
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

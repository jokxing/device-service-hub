import { formatDateTime } from "../../shared/utils/date";
import { Text } from "react-native";
import type { ServiceOrderRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import ContentCard from "../../shared/components/ContentCard";
import { typography } from "../../shared/styles/typography";
import { ORDER_STATUS_LABELS } from "./constants";
export default function OrderSnapshot({
  order,
}: {
  order: ServiceOrderRecord;
}) {
  return (
    <ContentCard title="服务订单">
      <Text style={typography.text}>
        {order.code} · {ORDER_STATUS_LABELS[order.status]}
      </Text>
      <Text style={typography.text}>报价版本：第 {order.quoteRevision} 版</Text>
      <Text style={typography.muted}>
        确认人：{order.confirmedBy.name} · {formatDateTime(order.createdAt)}
      </Text>
      {order.start && (
        <Text style={typography.muted}>
          开工：{order.start.actor.name} ·{" "}
          {formatDateTime(order.start.createdAt)}
        </Text>
      )}
      {order.cancellation && (
        <Text style={typography.muted}>
          取消：{order.cancellation.actor.name} · {order.cancellation.reason} ·{" "}
          {formatDateTime(order.cancellation.createdAt)}
        </Text>
      )}
      {order.items.map((item, index) => (
        <Text key={index} style={typography.text}>
          {item.name} · {item.quantity} × ¥{formatCents(item.unitPriceCents)}
        </Text>
      ))}
      <Text style={typography.text}>
        订单金额：¥{formatCents(order.totalCents)}（人民币）
      </Text>
      <Text style={typography.muted}>
        以上为确认时的订单快照，维修完成不代表付款。本地模拟不发生真实扣款，真实支付未接入。
      </Text>
    </ContentCard>
  );
}

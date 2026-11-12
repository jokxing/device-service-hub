import { Text } from "react-native";
import type { QuoteRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { typography } from "../../shared/styles/typography";
const labels: Record<QuoteRecord["status"], string> = {
  pending: "待用户确认",
  accepted: "已确认",
  rejected: "已拒绝",
};
export default function QuoteSummary({ quote }: { quote: QuoteRecord }) {
  return (
    <>
      <Text style={typography.text}>
        第 {quote.revision} 版 · {labels[quote.status]}
      </Text>
      {quote.items.map((item, index) => (
        <Text key={index} style={typography.text}>
          {item.name} · {item.quantity} × ¥{formatCents(item.unitPriceCents)}
          {item.note ? " · " + item.note : ""}
        </Text>
      ))}
      <Text style={typography.text}>
        报价合计：¥{formatCents(quote.totalCents)}（人民币）
      </Text>
      {quote.rejection && (
        <Text style={typography.muted}>拒绝原因：{quote.rejection.reason}</Text>
      )}
    </>
  );
}

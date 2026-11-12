import { Text, View } from "react-native";
import type { PaymentRecord } from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { formatDateTime } from "../../shared/utils/date";
import { typography } from "../../shared/styles/typography";
import { spacing } from "../../shared/theme";
export default function RefundSummary({
  refund,
}: {
  refund: NonNullable<PaymentRecord["refund"]>;
}) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={typography.text}>
        {refund.status === "succeeded"
          ? "退款成功（模拟）"
          : "退款申请待处理（模拟）"}
      </Text>
      <Text style={typography.text}>
        退款金额：¥{formatCents(refund.amountCents)}（人民币）
      </Text>
      <Text style={typography.text}>退款原因：{refund.reason}</Text>
      <Text style={typography.muted}>
        申请时间：{formatDateTime(refund.createdAt)}
      </Text>
      {refund.completion ? (
        <>
          <Text style={typography.muted}>
            处理人：{refund.completion.actor.name}
          </Text>
          <Text style={typography.muted}>
            处理时间：{formatDateTime(refund.completion.createdAt)}
          </Text>
          <Text style={typography.muted}>
            以上是本地模拟处理结果，不代表真实资金退回。
          </Text>
        </>
      ) : (
        <Text style={typography.muted}>
          申请已提交，等待管理员处理；申请期间暂停开工，尚未退款成功。
        </Text>
      )}
    </View>
  );
}

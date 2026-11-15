import { Text, View } from "react-native";
import type {
  AlipaySandboxPaymentRecord,
  ServiceOrderRecord,
} from "@device-service-hub/contracts";
import { formatCents } from "@device-service-hub/contracts/quote-rules";
import { useNativeSession } from "../../auth/sessionContext";
import ActionButton from "../../../shared/components/ActionButton";
import { useApiMutation } from "../../../shared/hooks/useApiMutation";
import { typography } from "../../../shared/styles/typography";
import { spacing } from "../../../shared/theme";
import { formatDateTime } from "../../../shared/utils/date";
import { queryAlipayRefund } from "./api";
import RequestAlipayRefundAction from "./RequestAlipayRefundAction";

export default function AlipayRefundSection({
  order,
  payment,
  disabled,
  reload,
}: {
  order: ServiceOrderRecord;
  payment: AlipaySandboxPaymentRecord;
  disabled: boolean;
  reload: (orderChanged?: boolean) => void;
}) {
  const { post } = useNativeSession();
  const mutation = useApiMutation();
  const refund = payment.refund;
  if (!refund)
    return (
      <RequestAlipayRefundAction
        order={order}
        payment={payment}
        disabled={disabled}
        reload={reload}
      />
    );
  return (
    <View style={{ gap: spacing.sm }}>
      <Text style={typography.text}>
        {
          {
            requested: "退款待处理",
            processing: "退款处理中",
            succeeded: "退款成功",
          }[refund.status]
        }
      </Text>
      <Text style={typography.text}>
        退款金额：¥{formatCents(refund.amountCents)}
      </Text>
      <Text style={typography.text}>退款原因：{refund.reason}</Text>
      <Text style={typography.muted}>
        申请时间：{formatDateTime(refund.createdAt)}
      </Text>
      {!!refund.succeededAt && (
        <Text style={typography.muted}>
          成功时间：{formatDateTime(refund.succeededAt)}
        </Text>
      )}
      <Text style={typography.muted}>
        {refund.status === "succeeded"
          ? "全额退款已核验，服务订单与工单已结束，原支付记录保留。"
          : "申请后暂停开工，由管理员在 Web 处理。本页处于前台时自动同步结果。"}
      </Text>
      <ActionButton
        title="查询退款结果"
        secondary
        disabled={disabled || mutation.pending}
        onPress={() =>
          mutation.run(
            (signal) => queryAlipayRefund(post, order.id, payment.id, signal),
            (result) =>
              reload(
                result.refund?.status === "succeeded" &&
                  order.status !== "cancelled",
              ),
          )
        }
      />
      {!!mutation.error && (
        <Text style={typography.error}>{mutation.error}</Text>
      )}
    </View>
  );
}
